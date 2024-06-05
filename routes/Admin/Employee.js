const express = require("express");
const route = express.Router();
const authenticate = require("../../middlewares/authenticate");
const employee = require("../../models/employee");
const bcrypt = require("bcrypt");
const Employeeatten = require("../../models/employeeatten");

route.get("/getEmployeeId", authenticate, async (req, res) => {
  try {
    // Step 1: Find the employee with the highest ID using aggregation
    const highestEmployee = await employee.aggregate([
      {
        $project: {
          EmployeeId: 1,
          numericId: { $toInt: { $substr: ["$EmployeeId", 3, -1] } } // Extracts the numeric part and converts to an integer
        }
      },
      { $sort: { numericId: -1 } }, // Sorts by the numeric part in descending order
      { $limit: 1 } // Limits the result to the highest ID
    ]);

    // Step 2: Generate the next EmployeeId
    let nextEmployeeId = "EMP1"; // Default if there are no employees

    if (highestEmployee.length > 0) {
      const highestNumericId = highestEmployee[0].numericId;
      const nextNumericId = highestNumericId + 1;
      nextEmployeeId = `EMP${nextNumericId}`;
    }

    // console.log("🚀 ~ route.get ~ nextEmployeeId:", nextEmployeeId);

    res.status(200).json({ EmployeeId: nextEmployeeId });
  } catch (error) {
    console.error("Error generating new employee ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



  route.post("/addEmployee", authenticate, async (req, res, next) => {
    try {
      const role = req.user.role;
      console.log("Role:", role);
  
      if (role === "admin") {
        const EmployeeId = req.body.EmployeeId;
        const firstname = req.body.firstName;
        const lastname = req.body.lastName;
        const email = req.body.email;
        const phone = req.body.phone;
        const password = req.body.password;
        const confirmpassword = req.body.confirmPassword;
  
        // Validate user type
  
        // Validate other input fields as needed...
  
        // Check if email already exists
        const existingUser = await employee.findOne({ email });
        if (existingUser) {
          return res.status(404).json({ message: "Email already exists" });
        }
  
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Create user based on user type
  
        const newEmployee = new employee({
          EmployeeId: EmployeeId,
          firstName: firstname,
          lastName: lastname,
          email: email,
          Phone_number: phone,
          password: hashedPassword,
          confirmpassword: hashedPassword,
          status: "active",
        });
  
        await newEmployee.save();
  
        res.status(200).json({ message: "User created successfully" });
      } else {
        res.status(403).json({ message: "Permission denied" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  route.get("/manageemployee", authenticate, async (req, res, next) => {
    try {
      const role = req.user.role;
      // console.log('Role:', role);
      console.log(role);
      console.log(role);
      console.log(role);
      if (role === "admin") {
        const allEmployees = await employee.find({}).sort({ createdAt: -1 });
        console.log(allEmployees);
        res.status(200).json({ employees: allEmployees });
      } else {
        res.status(403).json({ message: "Permission denied" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });


  route.post("/blockemployee", authenticate, async (req, res) => {
    try {
      const role = req.user.role;
  
      if (role === "admin") {
        const { email } = req.body;
        console.log(email);
        const employeeOne = await employee.findOne({ email });
        if (!employeeOne) {
          return res.status(404).json({ message: "Employee not found" });
        }
  
        // Set status to inactive (blocked)
        employeeOne.status = "inactive";
        employeeOne.save();
  
        res.status(200).json({ message: "Employee blocked successfully" });
      } else {
        res.status(403).json({ message: "Permission denied" });
      }
    } catch (error) {
      console.error("Error blocking employee:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

  route.post("/unblockemployee", authenticate, async (req, res) => {
    try {
      const role = req.user.role;
      if (role === "admin") {
        const { email } = req.body;
  
        const employeeOne = await employee.findOne({ email });
        if (!employeeOne) {
          return res.status(404).json({ message: "Employee not found" });
        }
  
        // Set status to active (unblocked)
        employeeOne.status = "active";
        await employeeOne.save();
  
        res.status(200).json({ message: "Employee unblocked successfully" });
      } else {
        res.status(403).json({ message: "Permission denied" });
      }
    } catch (error) {
      console.error("Error unblocking employee:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  route.get('/employeeatten', authenticate, async(req,res)=>{
    try {
      const data = await Employeeatten.find().sort({timestamp:-1})
      console.log(data)
      res.status(200).json(data)
    }
    catch (error) {
      
    }
  })
  

  module.exports = route;