import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AuthService } from "../../auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { GridDataResult, DataStateChangeEvent } from "@progress/kendo-angular-grid";
import { User } from "../../user";
import { SortDescriptor, orderBy, State, process } from '@progress/kendo-data-query';
import { Data } from "../data";

@Component({
  selector: "user-list",
  templateUrl: "./user-list.component.html",
  providers: [Data],
  encapsulation: ViewEncapsulation.Emulated,
  styleUrls: ["./user-list.component.css"]
})

export class UserListComponent implements OnInit {

  userList: Array<User> = [] as Array<User>;
  gridData: GridDataResult;
  errorMessage: string = null;

  title: string = "Manage Users";
  tabText: string = "Manage Users";
  tabColor: string = "default-tab";
  breadCrumLink: string = "Manage Users";
  isAdmin: boolean;
  isDM: boolean;

  public sort: SortDescriptor[] = [{ 'field': "userName", 'dir': "asc" }];
  public state: State = {
    skip: 0,
    take: 10,
    filter: {
      logic: "and",
      filters: [{ field: 'email', operator: 'contains', value: '' }]
    }
  };
  public currentUser: User;
  currentUserName: string;

  constructor(private route: ActivatedRoute, public authService: AuthService, private router: Router, private data: Data) {
    this.isAdmin = this.authService.getAdminInRole();
    this.isDM = this.authService.getDistAdminInRole();
  }

  ngOnInit() {
    this.authService.getCurrent().subscribe(authResult => {
      this.currentUser = authResult;
      this.currentUserName = this.currentUser.Email;
    });

    this.route.data
      .subscribe((data: { userList: User[] }) => {
        this.userList = data.userList;
      });
    this.loadItems();
  }

  private loadItems(): void {
    this.gridData = {
      data: orderBy(this.userList.slice(this.state.skip, this.state.skip + this.state.take), this.sort),
      total: this.userList.length
    };
  }

  private loadAllItems(): void {
    this.gridData = {
      data: orderBy(this.userList, this.sort),
      total: this.userList.length
    };
  }

  getExtract() {
    let fileName: string = "UserList.csv";

    this.authService
      .getExtract()
      .subscribe(blob => {
        var link: any = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      });
  }

  dataStateChange(state: DataStateChangeEvent): void {
    this.state = state;
    this.gridData = process(this.userList, this.state);
  }

  addHandler(): void {
    sessionStorage.removeItem("cctstsf-user");
    this.router.navigate(["/user-edit"]);
  }

  editHandler({ dataItem }) {
    let storage = {
      "fname": dataItem.fName,
      "lname": dataItem.lName,
      "password": dataItem.password,
      "passwordNew": dataItem.passwordNew,
      "username": dataItem.userName,
      "email": dataItem.email,
      "id": dataItem.id,
      "district": dataItem.district,
      "districtId": dataItem.districtId,
      "roles": dataItem.roles,
      "agencies": dataItem.agencies,
      "displayName": dataItem.displayName
    };
    sessionStorage.setItem("cctstsf-user", JSON.stringify(storage));
    this.router.navigate(['/user-edit']);
  }

  removeHandler({ dataItem }) {
    if (!window.confirm("Do you want to delete this user?")) {
      return;
    }
    var index = this.userList.indexOf(dataItem);
    this.authService
      .remove(dataItem.id)
      .subscribe((data) => {
        if (data.error == null) {
          window.alert("User delete succeeded.");
          this.userList.splice(index, 1);
          this.loadItems();
        } else {
          window.alert("User delete failed.");
        }
      });
  }

  //deactive
  deactiveUser({ id }) {
    if (!window.confirm("Do you want to deactivate this user?")) {
      return;
    }
    this.authService
      .deactive(id, this.currentUserName)
      .subscribe((data) => {
        if (data.error == null) {
          window.alert("User deactivation succeeded.");

          location.reload();
        } else {
          window.alert("User deactivation failed.");
        }
      });
  }

  //active user
  activeUser({ id }) {
    if (!window.confirm("Do you want to activate this user?")) {
      return;
    }
    this.authService
      .active(id, this.currentUserName) 
      .subscribe((data) => {
        if (data.error == null) {
          window.alert("User activation succeeded.");

          location.reload();
        } else {
          window.alert("User activation failed.");
        }
      });
  }


  sendEmailForPasswordReset(email) {
    this.authService
      .sendEmailReset(email)
      .subscribe(
        (data) => {
          if (!data.error) {
            alert("Password Reset Email Sent to " + email.email);
          } else {
            this.errorMessage = data.error.error;
            alert(this.errorMessage);
          }
        },
        (err) => {
          alert("Password Reset Failed!");
          this.errorMessage = err;
        }
      );
  }
}

