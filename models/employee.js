const mongoose=require('../Config/Connection')

const schema=mongoose.Schema
const employee=new schema({
    firstName:
    {
        type:String,
        required:true
    },
    lastName:
    {
        type:String,
        required:true
    }
    ,
    email:
    {
        type:String,
        required:true
    },
    Phone_number:
    {
        type:Number,
        required:true
    },
    token:
    {
        type:String,
    },
    isverified:
    {
        type:Boolean,
        default:false
    },
    password:
    {
        type:String
    },
    confirmpassword:
    {
        type:String
    },
    status:
    {
        type:String
    },
    role:
    {
        type:String,
        default:'employee'
    },
    EmployeeId:
    {
        type:String,
        required:true
        // default:'employee'
    },
    
    createdAt: {
        type: Date,
        default: Date.now
      }

    // companyType: {
    //     type: [String],
    //     enum: ['partnershipFirm', 'onePersonCompany', 'soleProprietorship','limitedLiabilityPartnership','privateLimitedCompany','publicLimitedCompany','section8Company'], // Add your predefined values here
    //     required: true
    // },
    // destination:
    // {
    //     type:String,
    //     required:true
    // },
    // officenumber:
    // {
    //     type:Number,
    //     required:true
    // }
})
module.exports=mongoose.model('employee',employee)