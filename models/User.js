export class User {
  constructor({ uid, email, displayName = null, createdAt = new Date() }) {
    this.uid = uid;
    this.email = email;
    this.displayName = displayName;
    this.createdAt = createdAt;
  }
}
