const mongoose=require('../Config/Connection')
const schema=mongoose.Schema
const admin=new schema({
    Name:
    {
        type:String,
        required:true
    },
    email:
    {
        type:String,
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
    role:
    {
        type:String,
        default:'admin'
    }
})
module.exports=mongoose.model('admin',admin)