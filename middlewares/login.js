const express = require("express");
const router = express.Router();
const registration = require("../models/registration");
const employee = require("../models/employee");
//const authenticate=require('../middlewares/authenticate')
// const checkrole=require('../middlewares/checkuser')
const employeeatten=require("../models/employeeatten")
const adminmodel = require("../models/admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const AdminEmail = require("../models/AdminEmail");
const EmailSettings = require("../models/EmailSettings");

// router.post('/login', async (req, res, next) => {
//     const email = req.body.email
//     const password = req.body.password
//     const role = req.body.userType
//     console.log(password,email,role)

//     try {
//     let existingUser
//       if(role==='user'){
//       existingUser = await registration.findOne({ email:email });
//       }
//       else if(role==='employee')
//       {
//         existingUser = await employee.findOne({ email:email });
//       }
//       else
//       {
//         existingUser = await adminmodel.findOne({ email:email });
//       }
//       //console.log()
//       //boolean temp= bcrypt.compare(password, existingUser.password)

//       if (!existingUser||!await bcrypt.compare(password,existingUser.password)) {
//         return res.status(401).json({ success:false,message: 'Invalid email or password' });
//       }

//       // Generate a JWT token
//       const token = jwt.sign({email}, 'your-secret-key', { expiresIn: '5s' });
//       existingUser.token=token
//       await existingUser.save()
//       res.status(200).json({ role:role,token,success:true });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ success:false,message: 'Internal Server Error' });
//     }
//   });

async function getEmailAddress() {
  try {
    // Find the admin email with status set to true
    const adminEmail = await AdminEmail.findOne({ status: true });

    if (!adminEmail) {
      throw new Error("Admin email with status true not found");
    }

    // Return the email address and password
    return { email: adminEmail.email, password: adminEmail.password };
  } catch (error) {
    console.error("Error fetching email address:", error);
    throw error; // Propagate the error to the caller
  }
}

// Async function to create the transporter with dynamic email address and default password
async function createTransporter() {
  try {
    const { email, password } = await getEmailAddress();

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password,
      },
    });
  } catch (error) {
    console.error("Error creating transporter:", error);
    throw error; // Propagate the error to the caller
  }
}

router.post("/forgot-password", async (req, res, next) => {
  const email = req.body.email;
  const role = req.body.userType;
  console.log(email, role);

  try {
    let existingUser;
    if (role === "user") {
      existingUser = await registration.findOne({ email: email });
    } else if (role === "employee") {
      existingUser = await employee.findOne({ email: email });
    } else if (role === "admin") {
      existingUser = await adminmodel.findOne({ email: email });
    }

    console.log(existingUser);
    if (!existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    //const secret=existingUser.password;
    // Generate a JWT token
    const token = jwt.sign({ id: existingUser._id }, "your-secret-key", {
      expiresIn: "5m",
    });

    const transporterInstance = await createTransporter();
    const from = await AdminEmail.findOne({ status: true });
    const emailSettings = await EmailSettings.findOne({
      title: "Reset Password",
    });
    const relink=`https://www.sstaxmentors.com/login/reset-password?token=${token}`
    // console.log(from.email)
    var mailOptions = {
      from: from.email,
      to: existingUser.email,
      subject: emailSettings.subject,
      // text: ${emailSettings.text}:http://localhost:5002/reset-password/${existingUser._id}/${token},
      text: `${emailSettings.text}\n\nreset password link: ${relink}`
    };

    transporterInstance.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        // console.log(mailOptions)
        // console.log("INFO",info)
        res.send({ status: "success" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/login", async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const role = req.body.userType;
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  console.log(password, email, role);
  console.log('latlong', latitude, longitude)

  try {
    let existingUser;
    if (role === "user") {
      existingUser = await registration.findOne({ email: email });
      if (existingUser.status === "inactive") {
        return res.send({ message: "User has been blocked" });
      }
      if (!existingUser.isverified) {
        return res.send({ messgae: "Please verify your account" });
      }
    } else if (role === "employee") {
      existingUser = await employee.findOne({ email: email });
      const entry = new employeeatten({
        email,
        activity: 'login',
        latitude: latitude,
        longitude: longitude,
        // ip: req.ip,
        // ip: req.socket.remoteAddress
      }) 
      console.log('entry',entry)
      entry.save()
      if (existingUser.status === "inactive") {
        return res.send({ message: "Employee has been blocked" });
      }
    } else {
      existingUser = await adminmodel.findOne({ email: email });
    }

    if (
      !existingUser ||
      !(await bcrypt.compare(password, existingUser.password))
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    let expiresIn = "1h"; // Default expiration for non-admin users
    if (role === "admin" || role === "employee") {
      expiresIn = "30d"; // Set expiresIn to a value that indicates it never expires
    }

    // Generate a JWT token
    const token = jwt.sign({ email, role }, "your-secret-key", { expiresIn });
    existingUser.token = token;
    await existingUser.save();

    res.status(200).json({ role: role, token, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
// router.get("/reset-password", (req, res) => {
//   const { token } = req.query;
//   if (!token) {
//       return res.status(400).send("Token is required.");
//   }

//   res.send(`
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Reset Password</title>
//         <link href="https://cdn.jsdelivr.net/npm/tailwindcss@^2.0/dist/tailwind.min.css" rel="stylesheet">
//     </head>
//     <body class="bg-gray-100 flex items-center justify-center min-h-screen">
//         <div class="max-w-md w-full">
//             <form action="http://localhost:5002/login/reset-password?token=${token}" method="POST" class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
//                 <input type="hidden" name="token" value="${token}">
//                 <div class="mb-4">
//                     <label for="password" class="block text-gray-700 text-sm font-bold mb-2">New Password:</label>
//                     <input type="password" id="password" name="password" required class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
//                 </div>
//                 <div class="mb-6">
//                     <label for="userType" class="block text-gray-700 text-sm font-bold mb-2">User Type:</label>
//                     <select name="userType" required class="block appearance-none w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500">
//                         <option value="user">User</option>
//                         <option value="employee">Employee</option>
//                         <option value="admin">Admin</option>
//                     </select>
//                 </div>
//                 <div class="flex items-center justify-between">
//                     <input type="submit" value="Reset Password" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
//                 </div>
//             </form>
//         </div>
//     </body>
//     </html>
//   `);
// });



// router.post("/reset-password", async (req, res, next) => {
//   console.log("Request received with token:", req.query.token);
//   console.log("hi");
//   const { token } = req.query;
//   const { password, userType } = req.body;
//   console.log(token, password, userType);

//   try {
//     jwt.verify(token, "your-secret-key", async (err, decoded) => {
//       if (err) {
//         console.log(err);
//         return res.json({ Status: "Error with Token" });
//       } else {
//         try {
//           const hash = await bcrypt.hash(password, 10);
//           const filter = { email: decoded.email }; // Correct filter format
//           const update = { password: hash };

//           if (userType === "user") {
//             await registration.findOneAndUpdate(filter, update);
//             console.log("Password updated successfully for user:", decoded.email);
//           } else if (userType === "admin") {
//             await adminmodel.findOneAndUpdate(filter, update);
//             console.log("Password updated successfully for user:", decoded.email);
//           } else {
//             await employee.findOneAndUpdate(filter, update);
//             console.log("Password updated successfully for employee:", decoded.email);
//           }
//           res.json({ success: true, message: "Password updated successfully" });
//         } catch ( error) {
//           console.error("Error updating password:", error);
//           res.status(500).json({ success: false, message: "Error updating password" });
//         }
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });



router.post("/reset-password", async (req, res) => {
  const { token, password, userType } = req.body;
  console.log("POST Data:", token, password, userType);

  if (!token || !password || !userType) {
      return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
      const decoded = jwt.verify(token, "your-secret-key");
      const hash = await bcrypt.hash(password, 10);
      const filter = { _id: decoded.id };
      const update = { password: hash };
      const userModel = { user: registration, admin: adminmodel, employee: employee }[userType];

      const updatedUser = await userModel.findOneAndUpdate(filter, update);
      if (!updatedUser) {
          return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
      console.log(error);
      res.status(500).json({ success: false, message: "Error processing your request" });
  }
});

module.exports = router;