const mongoose=require('../Config/Connection')
const schema=mongoose.Schema
const registration=new mongoose.Schema({
    firstname:
    {
        type:String,
        required:true
    },
    lastname:
    {
        type:String,
        required:true
    },
    DOB:
    {
        type:Date,
        default:null
    },
    address:
    {
        type:String,
        default:null
    },
    streetname:{
        type:String,
        default:null
    },
    city:
    {
        type:String,
        default:null
    },
    landmark:
    {
        type:String,
        default:null
    },
    state:
    {
        type:String,
        default:null
        
    },
    // companyname:{
    //     type:String,
    //     default:null
    // },
    country:
    {
        type:String,
        default:"India"
    },
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
        type:String,
        required:true
    },
    confirmpassword:
    {
        type:String,
        required:true
    },
    role:
    {
        type:String,
        enum:['user','admin'],
        default:'user'
    },
    status:
    {
        type:String,
        
    },
    typeOfC:
    {
        type:String,
        default:'interested'

    },
    createdAt: {
        type: Date,
        default: Date.now
      }
})
module.exports=mongoose.model('registration',registration)