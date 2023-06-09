const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const walletSchema = new Schema(
	{
		userId: {
			type: String,
			require: true,
		},
		phone: {
			type: String,
			require: true,
		},
		balance: {
			type: Number,
			default: 500,
		},
		pin: {
			type: String,
			default: '1234',
		},
	},
	{ timestamps: true }
);

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
