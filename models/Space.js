export class Space {
  constructor(data) {
    this.id = data.id || data._id || String(Date.now());
    this.name = data.name;
    this.invite_code = data.invite_code || data.code || '';
    this.canvas_id = data.canvas_id || data.canvasId || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.members = data.members || [];
  }
}
