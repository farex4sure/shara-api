const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
	{
		userId: {
			type: String,
			require: true,
		},
		amount: {
			type: String,
		},
		credit: {
			type: String,
		},
		debit: {
			type: String,
		},
		balance: {
			type: Number,
		},
		narration: {
			type: String,
		},
	},
	{ timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
