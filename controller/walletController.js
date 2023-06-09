const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const bcrypt = require('bcryptjs');
const accountSid = process.env.ACCOUNT_SID;
const auth_token = process.env.AUTH_TOKEN;
const twilio = require('twilio')(accountSid, auth_token);

// const createToken = (_id) => {
//   return jwt.sign({_id}, process.env.SECRET, { expiresIn: '3d' })
// }

// // // // // // User Wallet
const wallet = async (req, res) => {
	const { phone } = req.body;
	try {
		let user = await User.findOne({ phone });
		if (!user) {
			throw Error('user does not  exist!!');
		}
		let wallet = await Wallet.findOne({ phone });
		let transaction = await Transaction.find({ userId: user._id });
		if (!wallet) {
			throw Error('wallet does not  exist!!');
		}
		if (user && wallet) {
			res.status(200).json({
				user,
				wallet,
				transaction,
				message: 'wallet found successfully',
			});
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};
// // // // // // check receiver Wallet
const checkWallet = async (req, res) => {
	const { phone } = req.body;
	try {
		let user = await User.findOne({ phone }, { name: 1 });
		if (!user) {
			throw Error('user does not  exist!!');
		}
		let wallet = await Wallet.findOne({ phone });
		if (!wallet) {
			throw Error('wallet does not  exist!!');
		}
		if (user && wallet) {
			res.status(200).json({ user, message: 'wallet found successfully' });
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

// // // // // // create transaction pin
const createPin = async (req, res) => {
	const { id: userId, pin, token } = req.body;
	try {
		let wallet = await Wallet.findOne({ userId });

		if (!wallet) {
			throw Error('wallet does not  exist!!');
		}
		// // verify the token
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			throw Error('verification failed');
		}

		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(pin, salt);
		if (wallet) {
			wallet.pin = hash;
		}
		wallet = await wallet.save();

		res
			.status(200)
			.json({ wallet, message: 'transaction pin created successfully' });
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};
// // // // // // send funds to user
const sendMoney = async (req, res) => {
	const { id, senderphone, receiver, amount, pin, token, narration } = req.body;
	const amountToSend = parseInt(amount);
	if (!mongoose.isValidObjectId(id)) {
		return res.status(400).json({ error: 'Invalid vote credentials!' });
	}
	try {
		let sender = await User.findById(ObjectId(id));
		let senderWallet = await Wallet.findOne({ phone: senderphone });
		let receiverWallet = await Wallet.findOne({ phone: receiver });
		if (!sender) {
			throw Error("Sender's does not  exist!!");
		}
		if (!receiverWallet) {
			throw Error("Receiver's does not exist!!");
		}
		if (!senderWallet) {
			throw Error("senderWallet's does not exist!!");
		}
		// // verify the token
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			throw Error('verification failed');
		}
		if (senderWallet && receiverWallet && verify) {
			if (senderWallet?.balance < amountToSend) {
				throw new Error('Insufficient balance');
			}
			if (senderWallet?.pin !== pin) {
				// console.log(senderWallet?.pin, pin, "ioeioioiokrnklrnklrnkrrnmrfnklr");
				throw new Error('Incorrect transaction pin');
			}
		}
		const newSenderBalance = senderWallet.balance - amountToSend;
		const newSenderWallet = await Wallet.findOneAndUpdate(
			{ phone: senderphone },
			{ $set: { balance: newSenderBalance } },
			{ new: true }
		);

		const senderTransaction = await Transaction.create({
			userId: senderWallet.userId,
			amount: amountToSend,
			balance: newSenderBalance,
			debit: `Sucessfully sent ${amount} point to ${receiver}`,
			narration,
		});

		const newReceiverBalance = receiverWallet.balance + amountToSend;
		const newReceiverWallet = await Wallet.findOneAndUpdate(
			{ phone: receiver },
			{ $set: { balance: newReceiverBalance } },
			{ new: true }
		);

		const receiverTransaction = await Transaction.create({
			userId: receiverWallet.userId,
			amount: amountToSend,
			balance: newReceiverBalance,
			credit: `Sucessfully received ${amount} point from ${senderphone}`,
			narration,
		});

		if (
			newReceiverWallet &&
			newSenderWallet &&
			senderTransaction &&
			receiverTransaction
		) {
			return res.status(200).json({
				newSenderWallet,
				senderTransaction,
				message: 'Point sent successfully',
			});
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

// // // // // // recieve funds to user
const receiveMoney = async (req, res) => {
	const { id: userId, phone, amount } = req.body;
	try {
		let wallet = await Wallet.findOne({ userId });
		let receiver = await Wallet.findOne({ phone });

		if (!wallet) {
			throw Error('Sender does not  exist!!');
		}
		if (!receiver) {
			throw Error('Receiver does not exist!!');
		}
		if (receiver) {
			let credit = new Transaction(
				{ phone, amount, debit: wallet.userId },
				{ new: true }
			);
			let debit = new Transaction(
				{ userId, amount, credit: receiver.userId },
				{ new: true }
			);
			receiver.balance = receiver.balance + amount;
			receiver = await receiver.save();
			credit = credit.save();
			debit = debit.save();
			res.status(200).json({
				credit,
				debit,
				receiver,
				message: 'fund received successfully',
			});
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

// // // // // // send OTP token
const sendOtp = async (req, res) => {
	const { id, token } = req.body;
	try {
		let user = await User.findOne({ _id: id });

		if (!user) {
			throw Error('user does not  exist!!');
		}
		// // verify the token
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			throw Error('verification failed');
		}

		// Generate the OTP secret in base32 format
		const secret = speakeasy.generateSecret({ length: 20 });
		console.log(secret);
		// // Create the OTP token
		const OTP = speakeasy.totp({
			secret: secret.base32,
			encoding: 'base32',
		});

		// // send the OTP token to the user
		const sendmessage = await twilio.messages.create({
			from: '+17655133822',
			to: user.phone,
			body: `This is your ${OTP} token, valid for 5 minutes`,
		});
		if (sendmessage) {
			// user = await User.findOneAndCreate({userId: id},{secret:secret});
			// user = await user.save()
			res.status(200).json({
				OTP,
				secret,
				message: 'Password reset link sent successfully',
			});
		}
		if (!sendmessage) {
			throw Error(error);
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

// // // // // // Verify OTP token
const verifyOtp = async (req, res) => {
	const { id, token, otp, secret } = req.body;
	try {
		let user = await User.findOne({ _id: id });

		if (!user) {
			throw Error('user does not  exist!!');
		}
		// // verify the token
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			throw Error('user not verified failed');
		}
		// Verify an OTP token
		const verified = await speakeasy.totp.verify({
			secret: secret.base32,
			encoding: 'base32',
			token: otp,
			window: 4,
		});

		if (!verified) {
			throw Error('verification failed');
		}

		if (verified) {
			res.status(200).json({ verified, message: 'Verification successfully' });
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

// // // // // // Change Pin
const changePin = async (req, res) => {
	const { id, token } = req.body;
	try {
		let user = await User.findOne({ _id: id });

		if (!user) {
			throw Error('user does not  exist!!');
		}
		// // verify the token
		const verify = jwt.verify(token, process.env.SECRET);

		if (!verify) {
			throw Error('verification failed');
		}

		// Verify an OTP token
		const verified = speakeasy.totp.verify({
			secret: secret.base32,
			encoding: 'base32',
			token: 'ENTER TOKEN HERE',
			window: 2, // Allow for a 2-step window of time for the token to be verified
		});

		if (!verified) {
			throw Error('OTP verification failed');
		}

		if (verified) {
			res.status(200).json({ verified, message: 'Verification successfully' });
		}
	} catch (error) {
		res.status(404).json({ error: error.message });
	}
};

module.exports = {
	wallet,
	checkWallet,
	createPin,
	sendMoney,
	receiveMoney,
	sendOtp,
	verifyOtp,
	changePin,
};
