import { useState } from "react";

function Register() {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");

  return (
    <div className="card">

      <h2>建立新帳戶</h2>

      {step === 1 && (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="姓名"
          />

          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="暱稱"
          />

          <button
            onClick={() => {
              if (!name) {
                alert("請輸入姓名");
                return;
              }

              setStep(2);
            }}
          >
            下一步
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h3>拍照區</h3>

          <button onClick={() => setStep(1)}>
            返回
          </button>
        </>
      )}
    </div>
  );
}

export default Register;