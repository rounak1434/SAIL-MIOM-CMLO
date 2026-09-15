const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.assignUserRole = functions.auth.user().onCreate(async (user) => {
  let role = "user";

  if (
    user.email === "rs7070595@gmail.com" ||
    user.email === "mod@gmail.com"
  ) {
    role = "moderator";
  }

  if (user.email === "rs50421@gmail.com") {
    role = "admin";
  }

  await admin.firestore().collection("users").doc(user.uid).set({
    email: user.email,
    role: role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Assigned ${role} to ${user.email}`);
});