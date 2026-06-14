import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const configPath = './firebase-applet-config.json';
const firebaseEnv = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const firebaseConfig = {
  apiKey: firebaseEnv.apiKey,
  projectId: firebaseEnv.projectId,
  appId: firebaseEnv.appId,
  firestoreDatabaseId: firebaseEnv.firestoreDatabaseId || '(default)',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const ref = doc(db, "settings", "report_1781433606873_442");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      console.log("EXISTS!");
    } else {
      console.log("DOES NOT EXIST!");
    }
    process.exit(0);
  } catch (e) {
    console.log("FAIL", e.message);
    process.exit(1);
  }
}
test();
