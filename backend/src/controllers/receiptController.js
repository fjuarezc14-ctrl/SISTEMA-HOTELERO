import { receiptService } from '../services/receiptService.js';

export const receiptController = {
  generate(req, res, next) {
    try {
      const receipt = receiptService.generateReceiptData(req.body);
      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      next(error);
    }
  }
};
