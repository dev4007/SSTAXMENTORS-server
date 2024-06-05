const express = require("express");

const multer = require("multer");
require("dotenv").config();
const cors = require("cors");

const user = require("./routes/UserCrud");
const employee = require("./routes/employeecrud");
const admincrud = require("./routes/admincrud");
const login = require("./middlewares/login");
const companycrud = require("./routes/UserCompany");
const pay = require("./routes/payment");
const payment = require("./middlewares/paymenthistory");
const token = require("./routes/checktoken");
const transactions = require("./routes/transactions");

// Admin
const adminHome = require('./routes/Admin/Home')
const adminClient = require('./routes/Admin/Client')
const adminEmployee = require('./routes/Admin/Employee.js')
const adminNotification = require('./routes/Admin/Notification.js')
const adminSupportTicket = require('./routes/Admin/SupportTicket.js')
const adminInvoice = require('./routes/Admin/Invoice.js')
const adminTransaction = require('./routes/Admin/Transaction.js')
const adminITReturns = require('./routes/Admin/Document/ITReturns.js')
const adminGSTReturns = require('./routes/Admin/Document/GSTReturns.js')
const AdminGSTNotice = require('./routes/Admin/Document/GSTNotice.js')
const adminROCFilings = require('./routes/Admin/Document/ROCFilings.js')
const adminLicense = require('./routes/Admin/Document/License.js')
const adminCMA = require('./routes/Admin/Document/CMA.js')
const adminKYC = require('./routes/Admin/Document/KYC.js')
const adminHistory = require('./routes/Admin/FileHistory.js')
const adminITReturnsSettings = require('./routes/Admin/Settings/ITReturns.js')
const adminGSTReturnsSettings = require('./routes/Admin/Settings/GSTReturns.js')
const AdminGSTNoticeSettings = require('./routes/Admin/Settings/GSTNotice.js')
const adminROCFilingsSettings = require('./routes/Admin/Settings/ROCFilings.js')
const adminLicenseSettings = require('./routes/Admin/Settings/License.js')
const adminCMASettings = require('./routes/Admin/Settings/CMA.js')
const adminAddOnServiceSettings = require('./routes/Admin/Settings/AddOnService.js')
const adminBannerSettings = require('./routes/Admin/Settings/Banner.js')
const adminCompanySettings = require('./routes/Admin/Settings/Company.js')
const adminEmailSettings = require('./routes/Admin/Settings/Email.js')
const adminPaymentSettings = require('./routes/Admin/Settings/Payment.js')
const adminAddOnService = require('./routes/Admin/AddOnService.js')
const adminReminder = require('./routes/Admin/Reminder.js')
const adminNavigation = require('./routes/Admin/Navigation.js')



// Employee
const employeeReminder = require('./routes/Employee/Reminder.js')
const employeeHistory = require('./routes/Employee/FileHistory.js')
const employeeHome = require('./routes/Employee/Home.js')




//User
const userKYC = require('./routes/User/Document/KYC.js')
const userITReturns = require('./routes/User/Document/ITReturns.js')
const userGSTReturns = require('./routes/User/Document/GSTReturns.js')
const userGSTNotice = require('./routes/User/Document/GSTNotice.js')
const userROCFilings = require('./routes/User/Document/ROCFilings.js')
const userLicense = require('./routes/User/Document/License.js')
const userCMA = require('./routes/User/Document/CMA.js')
const userCompany = require('./routes/User/Company.js')
const userVerification = require('./routes/User/UserVerification.js')
const userSupportTicket = require('./routes/User/SupportTicket.js')
const userAddOnService = require('./routes/User/AddOnService.js')
const userHome = require('./routes/User/Home.js')
const userNavigation = require('./routes/User/Navigation.js')
const userNotification = require('./routes/User/Notification.js')
const userProfile = require('./routes/User/Profile.js')
const userPayment = require('./routes/User/Payment.js')
const userRegistration= require('./routes/User/Registration.js')
const userReminder= require('./routes/User/Reminder.js')



const app = express();
const PORT = process.env.PORT || 5002;
app.use(express.json({ limit: "50mb" }));

app.use(cors());



// Admin
 app.use("/admin/Home", adminHome);
 app.use("/admin/client", adminClient);
 app.use("/admin/employee", adminEmployee);
 app.use("/admin/notification", adminNotification);
 app.use("/admin/supportticket", adminSupportTicket);
 app.use("/admin/invoice", adminInvoice);
 app.use("/admin/transaction", adminTransaction);
 app.use("/admin/document/itreturns", adminITReturns);
 app.use("/admin/document/gstreturns", adminGSTReturns);
 app.use("/admin/document/gstnotice", AdminGSTNotice);
 app.use("/admin/document/rocfilings", adminROCFilings);
 app.use("/admin/document/cma", adminCMA);
 app.use("/admin/document/license", adminLicense);
 app.use("/admin/document/kyc", adminKYC);
 app.use("/admin/settings/itreturns", adminITReturnsSettings);
 app.use("/admin/settings/gstreturns", adminGSTReturnsSettings);
 app.use("/admin/settings/gstnotice", AdminGSTNoticeSettings);
 app.use("/admin/settings/rocfilings", adminROCFilingsSettings);
 app.use("/admin/settings/cma", adminCMASettings);
 app.use("/admin/settings/license", adminLicenseSettings);
 app.use("/admin/settings/addonservice", adminAddOnServiceSettings);
 app.use("/admin/settings/banner", adminBannerSettings);
 app.use("/admin/settings/company", adminCompanySettings);
 app.use("/admin/settings/email", adminEmailSettings);
 app.use("/admin/settings/payment", adminPaymentSettings);
 app.use("/admin/history", adminHistory);
 app.use("/admin/addonservice", adminAddOnService);
 app.use("/admin/reminder", adminReminder);
 app.use("/admin/navigation", adminNavigation);


 


 //Employee
 app.use("/employee/reminder", employeeReminder);
 app.use("/employee/history", employeeHistory);
 app.use("/employee/home", employeeHome);



 // User
 app.use("/user/kyc", userKYC);
 app.use("/user/document/itreturns", userITReturns);
 app.use("/user/document/gstreturns", userGSTReturns);
 app.use("/user/document/gstnotice", userGSTNotice);
 app.use("/user/document/rocfilings", userROCFilings);
 app.use("/user/document/cma", userCMA);
 app.use("/user/document/license", userLicense);
 app.use("/user/document/kyc", userKYC);
 app.use("/user/company", userCompany);
 app.use("/user/verification", userVerification);
 app.use("/user/supportticket", userSupportTicket);
 app.use("/user/addonservice", userAddOnService);
 app.use("/user/home", userHome);
 app.use("/user/navigation", userNavigation);
 app.use("/user/notification", userNotification);
 app.use("/user/profile", userProfile);
 app.use("/user/payment", userPayment);
 app.use("/user/registration", userRegistration);
 app.use("/user/reminder", userReminder);



app.use("/login", login);
app.use("/user", user);
app.use("/employee", employee);
app.use("/admin", admincrud);
app.use("/company", companycrud);
app.use("/payment", payment);
app.use("/transactions", transactions);
app.use("/pay", pay);
app.use("/token", token);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

