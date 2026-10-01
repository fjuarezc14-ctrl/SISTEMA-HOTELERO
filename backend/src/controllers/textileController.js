import { textileService } from '../services/textileService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req);
    res.status(req.method === 'POST' ? 201 : 200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const textileController = {
  listItems: handle(() => textileService.listItems()),
  createItem: handle((req) => textileService.createItem(req.body, req.user.id)),
  updateItem: handle((req) => textileService.updateItem(req.params.id, req.body)),
  addStock: handle((req) => textileService.addStock(req.params.id, req.body, req.user.id)),
  moveItem: handle((req) => textileService.moveItem(req.params.id, req.body, req.user.id)),
  listBatches: handle((req) => textileService.listBatches({ limit: req.query.limit })),
  sendToLaundry: handle((req) => textileService.sendToLaundry(req.body, req.user.id)),
  returnFromLaundry: handle((req) => textileService.returnFromLaundry(req.params.id, req.body, req.user.id))
};
