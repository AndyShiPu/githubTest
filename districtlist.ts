import { Component, OnInit, ViewEncapsulation, SkipSelf, Optional } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PsService } from "../../ps.service";
import { DistrictSummary } from "../../model/DistrictSummary";
import { StateSummary } from "../../model/StateSummary"
import { ReportsService } from "../../../reports/reports.service";
import { AuthService } from "../../../auth.service";
import { User } from "../../../user";
import { GridDataResult, DataStateChangeEvent } from "@progress/kendo-angular-grid";
import { State, process, SortDescriptor, orderBy } from '@progress/kendo-data-query';
import { map } from 'rxjs-compat/operator/map';
import { DistrictListSummary } from '../../model/DistrictListSummary';
import { Observable } from 'rxjs';

@Component({
  selector: "ps-district-list",
  templateUrl: "./ps-district-list.component.html",
  styleUrls: ["./ps-district-list.component.css"],
  providers: [PsService, ReportsService,],
  encapsulation: ViewEncapsulation.Emulated
})
export class PSDistrictListComponent implements OnInit {
   
  public districts: Array<DistrictSummary> = [];
  public stateInfo: StateSummary;
  public data: DistrictSummary;
  public districtListInfo: DistrictListSummary;

  public gridData: GridDataResult;
  public stateGridData: GridDataResult;
  public finalGridData: GridDataResult;

  public view: Observable<GridDataResult>;

  public stateData: Array<any> = [];
  public districtData: Array<any> = [];

  leaverYear: string;
  stateTotal: number;
  countTotal: number;
  finishedTotal: number;
  agencyName: string;
  agencyId: number;
  currentUser: User;
  progressValue: string;
  tabText: string = "District List";
  tabColor: string = "default-tab";
  breadCrumLink: string = "District List";
  isAdmin: boolean = false;
  isDistrict: boolean;
  isESD: boolean = false;
  isGridDataAvailable: boolean;
  decimal_precision: number;
  
  downloadingRawData = false;
  downloadingContactReport = false;

  headerColorStylePrimary = { 
    'background-color': '#b4defb',
    'white-space': 'normal',
    'text-align': 'center',
    'font-weight': 'bold',
    'color': 'black',
    'vertical-align': 'inherit'
    }

  leaverYears: Array<string> = ["2020-21","2019-20","2018-19","2017-18", "2016-17", "2015-16", "2014-15", "2013-14", "2012-13"];

  public state: State = {
    skip: 0,
    take: 5,
    filter: {
      logic: "and",
      filters: [{ field: 'districtName', operator: 'contains', value: '' }]
    }
  };

  public sort: SortDescriptor[] = [{
    field: 'subjectName',
    dir: 'asc'
  }];

  public sortChange(sort: SortDescriptor[]): void {
    // HTML KendoGrid Column field must match the name in the GridData object to be sortable 
    this.sort = sort;
    this.loadDistrictGridView();
  }

  constructor(private route: ActivatedRoute, private psService: PsService, private router: Router, private reportsService: ReportsService, private authService: AuthService) {


    this.leaverYear = this.route.snapshot.params['leaverYear'];
    this.isESD = this.authService.getEsdInRole();

    this.agencyName = "CCTS";
    this.agencyId = 90;
    this.stateTotal = 0.0;
    this.decimal_precision = 2;

    this.authService.isUserInRole('Administrators').subscribe(res => this.isAdmin = res);

    this.authService.getCurrent().subscribe(authResult => {
      this.currentUser = authResult;
    });
    this.isGridDataAvailable = false;
  }

  ngOnInit() {
    if (!this.leaverYear) {
      this.leaverYear = this.leaverYears[0];
    }   
    if (this.agencyId > 0 && this.agencyId != 90) {
      this.isDistrict = true;
    }
    this.psService
      .getDistrictsSummary(this.agencyId, this.leaverYear)
      .subscribe(result => {
        this.districts = result.districtSummaries;
        this.stateInfo = result.stateSummary;
        this.loadGridData();
        this.loadDistrictGridView();

        this.stateData.push(this.stateInfo);
        this.stateGridData = {
          data: this.stateData,
          total: this.stateInfo.totalCount
        };
        this.stateTotal = this.stateInfo.progress;
        
        });
  }

  get showLink() {
    var isAdmin = this.authService.getAdminInRole();
    var isESD = this.authService.getEsdInRole();
    var isCompleteSurveys = this.authService.getCompleteSurveysInRole();
    var isVerifier = this.authService.getVerifierInRole();
    var isReports = this.authService.getReportsInRole();

    return (isAdmin || isESD || isCompleteSurveys || isVerifier || !isReports);
  }

  loadGridData() {
    for (var itr = 0; itr < this.districts.length; itr++) {
      this.data = this.districts[itr];
      var district = {
        districtName: this.data.districtName,
        isVerified: this.data.isVerified,
        totalCount: this.data.totalCount,
        progress: this.data.progress,
        contactRate: this.data.contactRate,
        responseRate: this.data.responseRate,
        notStartedCount: this.data.notStartedCount,
        startedCount: this.data.startedCount,
        finishedCount: this.data.finishedCount,
        districtAgencyId: this.data.districtAgencyId
      }
      this.districtData.push(district);
    }
  }


    loadDistrictGridView(): void {
      const total = this.districtData.filter((district) => district.districtName === "Totals:").pop()
      const dataArray = orderBy(this.districtData.filter((district) => district.districtName !== "Totals:"), this.sort)
      dataArray.push(total)
      this.gridData = {
        data: this.districtData,
        total: this.districtData.length
      };
      this.finalGridData = {
        data: dataArray,
        total: this.districtData.length
      }
      this.isGridDataAvailable = true;
    }

    dataStateChange(state: DataStateChangeEvent): void {
        this.state = state;
      this.gridData = process(this.districtData, this.state);
      this.finalGridData = process(this.districtData, this.state)

        
    }

    ParseFloat(str,val) {
      str = str.toString();
      str = str.slice(0, (str.indexOf(".")) + val + 1); 
      return Number(str);   
    }
    getProgressValue(progress: number): any {
        var progressString = ((progress * 100.00)).toFixed(2);
        if (progress == 1){
          return +progressString
        }
        if (progress == 0){
          return 0
        }
        return progressString;
    }

  getMyStyles(progress: number, totalCount: number) {
    this.progressValue = (progress * 100.00).toFixed(this.decimal_precision);
    var myStyles = {};
    if ((this.progressValue === "100.00") && (totalCount === 0)) {
      myStyles = {
        "width.%": 100,
        "background": "lightblue",
        "float": "left"
      }
    } else if (this.progressValue === "100.00") {
      myStyles = {
        "width.%": +this.progressValue,
        "background": "lightgreen",
        "float": "left"
      }
    } else if (totalCount > 0 && progress !== 0) {
      myStyles = {
        "width.%": +this.progressValue,
        "background": "orange",
        "float": "left"
      }
    } else if (totalCount === 0) {
      myStyles = {
        "width.%": 100,
        "background": "lightgray",
        "float": "left"
      }
    } else {
      myStyles = {
        "width.%": 100,
        "background": "lightgray",
        "float": "left"
      }
    }

    return myStyles;
  }

  getPercent(total: number): number {
    var newTotal = (total * 100).toFixed(2);
    return +newTotal;
  }

  doSsidSearch(ssid: string) {
    this.psService
      .doSSIDSearch(ssid, this.currentUser.Email, this.leaverYear, +'-1')
      .subscribe(res => {

        var schoolId = res[0].schoolId;

        if (schoolId < 0) {
          window.alert("Could not find student with SSID " + ssid + ".");
        }
        else {
          this.router.navigate(['/ps-students-list', this.leaverYear, schoolId, ssid]);
        }
      });
  }

  getContactRateReport() {
    let fileName: string = this.agencyName + "-Indicator-14-Survey-Status-by-District-Spreadsheet.xlsx";

    this.reportsService
      .getPostSchoolContactReport(this.agencyId.toString(), this.leaverYear, this.agencyName)
      .subscribe(blob => {
        var link: any = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      });
  }

  getContactRateReportDistList() {
    let fileName: string = this.agencyName + "-Indicator-14-Survey-Status-by-District-Spreadsheet.xlsx";
    this.downloadingContactReport = true;

    this.reportsService
      .getPostSchoolContactReportDistList(this.agencyId.toString(), this.leaverYear, this.agencyName)
      .subscribe(blob => {
        var link: any = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        this.downloadingContactReport = false;
      });
  }

  getExcelExtractReportV2() {
    let fileName: string = "WashingtonState-Indicator14-Survey-Status-Report.xlsx";
    this.downloadingRawData = true;

    this.reportsService
      .getPostSchoolExtractReportV2(this.agencyId.toString(), this.leaverYear)
      .subscribe(blob => {
        var link: any = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        this.downloadingRawData = false;
      });
  }

  getExcelExtractReport() {
    let fileName: string = "WashingtonState-Indicator14-Survey-Status-Report.xlsx";

    this.reportsService
      .getPostSchoolExtractReportDemo('90', this.leaverYear)
      .subscribe(blob => {
        var link: any = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      });
  }

  //On change of Leaver Year drop-down list
  onLYearChange(leaverYear) {
    this.leaverYear = leaverYear;
    this.router.navigate(['/ps-district-list', this.leaverYear]);
  }



}
