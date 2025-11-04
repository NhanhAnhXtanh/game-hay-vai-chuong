import { useEffect } from "react";
import { connectAnonymous, db } from "./firebase";
import { ref, set } from "firebase/database";

function App() {
  useEffect(() => {
    async function testFirebase() {
      const user = await connectAnonymous();
      console.log("Đăng nhập ẩn danh:", user?.uid);

      // Ghi dữ liệu test vào database
      await set(ref(db, "test/message"), {
        text: "Xin chào Firebase!",
        uid: user?.uid,
      });
    }

    testFirebase();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111",
        color: "#fff",
        fontSize: "2rem",
        fontWeight: "bold",
      }}
    >
      TicTacToe React + Firebase
    </div>
  );
}

export default App;
