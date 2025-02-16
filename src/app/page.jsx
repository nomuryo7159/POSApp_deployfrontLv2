"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "./globals.css";
// import { BarcodeFormat } from "@zxing/library"; // 必要ならZxingのライブラリを追加

const BarcodeScannerComponent = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false });

// navigator.mediaDevices.getUserMedia({ video: true })
//   .then((stream) => {
//     console.log("カメラアクセス成功");
//   })
//   .catch((err) => {
//     console.error("カメラアクセスエラー:", err);
//   });

// export default function BarcodeScannerDebug() {
//   const [code, setCode] = useState("");

// // スキャン結果のログを表示
// const handleScan = (data) => {
//   if (data?.text) {
//     console.log("📸 スキャン成功: ", data); // スキャン結果全体を表示
//     console.log("📌 読み取ったバーコードの値:", data.text); // 取得したテキストのみ表示
//     setCode(data.text.trim());
//   } else {
//     console.warn("⚠ バーコードが検出されませんでした");
//   }
// };

//   // エラー発生時のログを表示
//   const handleError = (err) => {
//     console.error("🚨 スキャンエラー:", err);
//   };

export default function PurchaseForm() {
  const [prd_id, setPrd_id] = useState("");
  const [product_code, setProductCode] = useState("");
  const [tax_code, setTaxCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState(null);
  const [purchaseList, setPurchaseList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [percent, setPercent] = useState(null);

  // バーコード読み取り時の処理
  const handleScan = async (data) => {
    if (data) {
      setProductCode(data.text);
      setScanning(false); // スキャン後にカメラをオフ
      await fetchItemData(data.text); // 商品情報を取得
    }
  };

  // カメラエラー処理
  const handleError = (err) => {
    if (err.name !== "NotFoundException") {
      console.error(err);
    }
  };

  // 商品情報を取得
  const fetchItemData = async (code) => {
    if (!code) {
      console.warn("無効なコードです");
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/search?code=${code}`);
      if (!res.ok) {
        throw new Error("サーバーエラーが発生しました");
      }
      const data = await res.json();

      if (!data) {
        throw new Error("商品がマスタ未登録です");
      }

      setPrd_id(data.prd_id);
      setName(data.name);
      setPrice(data.price);
      setProductCode(data.code);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message);
      setPrice(null);
      setName("");
    }
  };

  const handleAddItem = async () => {
    if (name && price > 0) {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/taxes");
        if (!res.ok) {
          throw new Error("サーバーエラーが発生しました");
        }
        const taxData = await res.json();
        if (!taxData) {
          throw new Error("税情報が取得できませんでした");
        }
  
        setPurchaseList([
          ...purchaseList,
          {
            id: Date.now(),
            prd_id: prd_id,
            prd_code: product_code,
            prd_name: name,
            prd_price: price,
            tax_cd: taxData.tax_code,
          },
        ]);
  
        setName("");
        setPrice(null);
        setProductCode("");
        setTaxCode(taxData.tax_code);
        setPercent(taxData.percent);
      } catch (error) {
        console.error("税情報取得エラー:", error);
      }
    }
  };

  const handlePurchase = async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (!res.ok) {
        throw new Error("サーバーエラーが発生しました");
      }
  
      const { trd_id } = await res.json();
  
      const updatedPurchaseList = purchaseList.map((item) => ({
        ...item,
        trd_id,
      }));
  
      await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/purchase_details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPurchaseList),
      });
  
      let ttl_amt_ex_tax = 0;
      updatedPurchaseList.forEach((item) => {
        ttl_amt_ex_tax += Math.floor(Number(item.prd_price));
      });
  
      let total_amt = 0;
      updatedPurchaseList.forEach((item) => {
        total_amt += Math.floor(Number(item.prd_price * (1 + percent)));
      });
  
      const total = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/purchases", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trd_id, total_amt, ttl_amt_ex_tax }),
      });
  
      if (!total.ok) {
        throw new Error("サーバーエラーが発生しました");
      }
      
      alert(`合計金額は${total_amt}円（税込）、${ttl_amt_ex_tax}円（税抜）です`);
  
      setPurchaseList([]);
    } catch (error) {
      setErrorMessage(error.message); 
    }
  };
  

  return (
//     <div>
//       <h1>バーコードスキャナーデバッグ</h1>
//       <BarcodeScannerComponent
//         onUpdate={(err, result) => {
//           console.log("🔍 スキャンイベント発生:", { err, result }); // スキャンイベントのログ

//           if (result?.text) {
//             handleScan(result);
//           } else if (err) {
//             handleError(err);
//           }
//         }}
//       />
//       <p>スキャン結果: {code}</p>
//     </div>
//   );
// }

    <div className="container">
      <button className="button" onClick={() => setScanning(!scanning)}>
        {scanning ? "カメラ停止" : "スキャン（カメラ）"}
      </button>

      {scanning && (
        <div className="scanner_container">
          <BarcodeScannerComponent
          // videoConstraints={{
          //   facingMode: "environment",
          //   width: 1920,
          //   height: 1080,
          // }}
          //  formats={[
          //    BarcodeFormat.EAN_13,
          //    BarcodeFormat.CODE_128,
          //    BarcodeFormat.QR_CODE // 必要なフォーマットを追加
          //  ]}
            onUpdate={(err, result) => {
              if (result?.text) {
                handleScan(result);
              } else if (err) {
                handleError(err);
              }
            }}
          />
        </div>
      )}
      

      <div className="code_container">
        <p>{product_code}</p>
      </div>

      <div className="item_container">
        {errorMessage ? <p className="error">{errorMessage}</p> : <p>{name}</p>}
      </div>

      <div className="price_container">
        {price !== null && price > 0 ? <p>{price}円</p> : null}
      </div>

      <button className="button" onClick={handleAddItem}>
        追加
      </button>

      <h3>購入リスト</h3>
      <div className="item_list_container">
        <ul>
          {purchaseList.map((item) => (
            <li key={item.id}>
              {item.prd_name} x1 {item.prd_price}円 {Number(item.prd_price)}円
            </li>
          ))}
        </ul>
      </div>

      <button className="button" onClick={handlePurchase}>
        購入
      </button>
    </div>
  );
}
