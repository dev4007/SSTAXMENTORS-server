const express = require('express')
const PH = require('../models/PH')
const router = express.Router()
const authenticate = require('./authenticate')
const client = require('../models/registration')

router.post('/addpaymenthistory', async (req, res) => {
    const { user, P_id, Phone_number, DOP, amount, status } = req.body
    try {
        const ph = new PH({ user, P_id, Phone_number, DOP, amount, status })
        await ph.save();
        res.status(201).json({
            success: true,
            message: 'Added to payment history successfully'
        })
    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'Failed'
        })
    }
})

router.post('/updatepaymentstatus', async (req, res) => {
    const { user, order_id, amount, status } = req.body;
    console.log('user back', user, order_id, amount, status)
    // const { order_id,amount, status } = req.body;
    try {
        // Check if payment history entry exists
        // let phEntry = await PH.findOne({ _id: order_id });
        // if (!phEntry) {
        //     // If entry doesn't exist, add it
        //     console.log('new entry')
        //     phEntry = new PH({ user, _id: order_id, DOP:new Date(), amount, status });
        //     await phEntry.save();
        // } else {
        //     // Update existing entry's status
        //     phEntry.status = status;
        //     await phEntry.save();
        // }

        // res.status(200).json({
        //     success: true,
        //     message: 'Payment status updated successfully'
        // });
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        console.log("date",formattedDate)
        const ph = new PH({ user, order_id, amount, status, DOP: formattedDate })
        await ph.save();
        res.status(201).json({
            success: true,
            message: 'Added to payment history successfully'
        })
    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
});

router.post('/viewpaymenthistory',authenticate, async(req,res)=>{
    let temp;
    const user = req.user
    console.log(user)
    try {
        temp = await PH.find({user:user}).sort({DOP:-1})
        if(!temp){
            return res.status(201).json({message:'You have not paid any bills yet'})
        }
        return res.status(201).json({temp})
    } catch (error) {
        return res.status(401).json({message:'Error occured'})
    }
})


router.post('/viewpaymenthistoryadmin', authenticate, async (req, res) => {
    

    try {
        const user = req.body.clientId
        console.log(user)
        const userob = await client.findOne({email:user})
        console.log(userob)
        if (!userob) {
            return res.status(404).json({ message: 'Client not found' });
        }
        const paymentHistory = await PH.find({user:userob}).sort({ DOP: -1 }); // Fetch all payment history, sorted by date of payment
        console.log(paymentHistory)
        if (!paymentHistory || paymentHistory.length === 0) {
            return res.status(404).json({ message: 'No payment history found' });
        }
        return res.status(200).json({ paymentHistory });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Update payment status
// router.post('/updatepaymentstatus', async (req, res) => {
//     const { order_id, status } = req.body;
//     try {
//       // Find the payment history entry by order_id and update its status
//       await PH.findOneAndUpdate({ order_id }, { status });

//       res.status(200).json({
//         success: true,
//         message: 'Payment status updated successfully',
//       });
//     } catch (error) {
//       res.status(404).json({
//         success: false,
//         message: 'Failed to update payment status',
//       });
//     }
//   }); 
module.exports = router