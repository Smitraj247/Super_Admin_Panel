import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/super-admin';
mongoose.connect(uri).then(async () => {
  const User = mongoose.connection.collection('users');
  const Leave = mongoose.connection.collection('leaves');
  
  const users = await User.find({}).toArray();
  const now = new Date();
  
  const getCurrentCycleStart = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
  };
  
  const getNextCycleStart = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month < 6 ? new Date(year, 6, 1) : new Date(year + 1, 0, 1);
  };
  
  const currentCycleStart = getCurrentCycleStart(now);
  
  for (const user of users) {
    const joinDate = user.joiningDate ? new Date(user.joiningDate) : new Date(user.createdAt);
    let processCycle = getCurrentCycleStart(joinDate);
    
    let totalAllocated = 0;
    while (processCycle <= currentCycleStart) {
      totalAllocated += 6;
      processCycle = getNextCycleStart(processCycle);
    }
    
    const plLeaves = await Leave.find({
      user: user._id,
      leaveType: 'PL',
      status: { $in: ['APPROVED', 'PENDING'] }
    }).toArray();
    
    let totalUsed = 0;
    for (const l of plLeaves) {
      const from = new Date(l.fromDate);
      const to = new Date(l.toDate);
      const days = l.isHalfDay ? 0.5 : Math.ceil((to - from)/(1000*60*60*24)) + 1;
      totalUsed += days;
    }
    
    const correctPL = totalAllocated - totalUsed;
    
    console.log('User:', user.email, 'Join:', joinDate.toISOString().split('T')[0], 'Allocated:', totalAllocated, 'Used:', totalUsed, 'CorrectPL:', correctPL, 'OldPL:', user.leaveBalance?.PL);
    
    await User.updateOne(
      { _id: user._id },
      { $set: { 'leaveBalance.PL': correctPL, 'leaveBalance.SL': 6, 'leaveBalance.DL': 0, 'lastCycleRefill': currentCycleStart } }
    );
  }
  
  console.log('Done');
  process.exit(0);
});
