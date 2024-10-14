const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const fs = require("fs");
const { createCanvas } = require("canvas");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

// const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(bodyParser.json());

app.get(`/${token}`, (req, res) => {
  res.send(`6789`);
});

app.post(`/${token}`, (req, res) => {
  console.log("Webhook received:", req.body);
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const commands = [
  { command: "start", description: "Bắt đầu sử dụng bot" },
  { command: "help", description: "Xem hướng dẫn sử dụng bot" },
  { command: "check", description: "Xem danh sách ca và chi phí đã lưu" },
  { command: "total", description: "Xem tổng số tiền sổ thu chi hiện tại" },
  { command: "img", description: "Xuất thông tin ca và chi phí thành ảnh" },
  { command: "clear", description: "Xóa sổ kế toán đã lưu" },
];

async function setCommands() {
  try {
    await bot.setMyCommands(commands);
    console.log("Bot commands đã được cài đặt thành công.");
  } catch (error) {
    console.error("Lỗi khi cài đặt bot commands:", error);
  }
}

setCommands();

let groupRecordsCa = {};
let groupRecordsPhi = {};

// Hàm xử lý cú pháp tin nhắn
const parseAddCaCommand = (msgText) => {
  const regex = /\/addca (\w+)(.*)/;
  const match = msgText.match(regex);

  if (!match) return null; // Không khớp cú pháp cơ bản

  const name = match[1].toUpperCase(); // Tên (AT, AS, ...)
  let ca = 0,
    lai = 0,
    khac = 0;

  // Tìm và phân tích các phần ca, lai, khac trong tin nhắn
  const caMatch = /c(\d+)/i.exec(match[2]);
  const laiMatch = /l(\d+)/i.exec(match[2]);
  const khacMatch = /k(\d+)/i.exec(match[2]);

  if (caMatch) ca = parseInt(caMatch[1], 10);
  if (laiMatch) lai = parseInt(laiMatch[1], 10);
  if (khacMatch) khac = parseInt(khacMatch[1], 10);

  return { name, ca, lai, khac };
};
const parseAddPhiCommand = (msgText) => {
  const regex = /\/addphi\s+(.+),(\d+)/; // Cú pháp như: /addphi nước ngọt,200
  const match = msgText.match(regex);

  if (!match) return null; // Nếu cú pháp không đúng, trả về null

  const name = match[1]; // Tên chi phí
  const amount = parseInt(match[2], 10); // Số tiền

  return { name, amount };
};
const calculateTotal = (records) => {
  let total = 0;
  if (!records || records.length === 0) return;
  records.forEach((record) => {
    total += record.amount;
  });
  return total;
};
// hàm vẽ bảng ca
// function createTableImageListSeaFood(records) {
//   const columns = 6; // Số lượng cột cố định (STT, Tên, Ca, Lai, Khác, Thời gian)
//   const header = [
//     "STT",
//     "TÊN",
//     "TIỀN CA",
//     "TIỀN LAI",
//     "TIỀN KHÁC",
//     "GIỜ VÀO SỔ",
//   ]; // Tiêu đề của bảng
//   const totals = records.reduce(
//     (acc, record) => {
//       acc.ca += record.ca;
//       acc.lai += record.lai;
//       acc.khac += record.khac;
//       return acc;
//     },
//     { ca: 0, lai: 0, khac: 0 }
//   );
//   const footer = [
//     "Tổng",
//     ,
//     totals.ca.toLocaleString("vi-VN"),
//     totals.lai.toLocaleString("vi-VN"),
//     totals.khac.toLocaleString("vi-VN"),
//     "",
//   ]; // Dữ liệu footer (có thể thêm tổng ở đây)
//   const rows = records.length + 3; // Số hàng: bao gồm tiêu đề + dữ liệu + footer

//   const cellWidth = 120;
//   const cellHeight = 50;
//   const canvasWidth = columns * cellWidth;
//   const canvasHeight = rows * cellHeight;

//   const canvas = createCanvas(canvasWidth, canvasHeight);
//   const ctx = canvas.getContext("2d");

//   // Vẽ nền
//   ctx.fillStyle = "#fff";
//   ctx.fillRect(0, 0, canvas.width, canvas.height);

//   // Vẽ tiêu đề "Chi phí"
//   ctx.fillStyle = "#000"; // Màu chữ
//   ctx.font = "18px Arial"; // Cỡ chữ
//   ctx.fillText("Sổ chi tiết ca", canvas.width / 2, 30);

//   // Vẽ cuối dưới footer
//   ctx.fillStyle = "#000"; // Màu chữ
//   ctx.font = "18px Arial"; // Cỡ chữ
//   ctx.fillText(
//     `Thu về : ${
//       totals.ca.toLocaleString("vi-VN") +
//       totals.lai.toLocaleString("vi-VN") +
//       totals.khac.toLocaleString("vi-VN")
//     }, `,
//     canvas.width / 2,
//     30
//   );

//   // Vẽ bảng
//   ctx.strokeStyle = "#000";
//   ctx.lineWidth = 1;
//   ctx.fillStyle = "#000"; // Màu chữ

//   // Vẽ tiêu đề ở hàng đầu tiên (hàng 0)
//   header.forEach((title, colIndex) => {
//     const x = colIndex * cellWidth;
//     const y = 50; // Hàng đầu tiên
//     ctx.font = "bold 15px Arial";
//     ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
//     ctx.fillText(title, x + 10, y + 30); // Vẽ tiêu đề
//   });

//   // Vẽ dữ liệu từ records
//   records.forEach((record, rowIndex) => {
//     const data = [
//       (rowIndex + 1).toString(), // Số thứ tự (STT)
//       record.name,
//       record.ca.toLocaleString("vi-VN"),
//       record.lai.toLocaleString("vi-VN"),
//       record.khac.toLocaleString("vi-VN"),
//       record.time,
//     ];

//     data.forEach((item, colIndex) => {
//       const x = colIndex * cellWidth;
//       const y = (rowIndex + 2) * cellHeight; // Hàng dữ liệu bắt đầu từ hàng 1
//       ctx.font = "14px Arial";
//       ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
//       ctx.fillText(item, x + 10, y + 30); // Vẽ dữ liệu
//     });
//   });

//   // Vẽ footer ở hàng cuối cùng
//   footer.forEach((footerItem, colIndex) => {
//     const x = colIndex * cellWidth;
//     const y = (rows - 1) * cellHeight; // Hàng cuối cùng
//     ctx.fillStyle = "#FF0000";
//     ctx.font = "bold 16px Arial";
//     ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
//     ctx.fillText(footerItem, x + 10, y + 30); // Vẽ dữ liệu footer
//   });

//   return canvas.toBuffer(); // Trả về buffer ảnh
// }
function createTableImageListSeaFood(records) {
  const columns = 6; // Số lượng cột cố định (STT, Tên, Ca, Lai, Khác, Thời gian)
  const header = [
    "STT",
    "TÊN",
    "TIỀN CA",
    "TIỀN LAI",
    "TIỀN KHÁC",
    "GIỜ VÀO SỔ",
  ]; // Tiêu đề của bảng

  // Tính tổng các khoản tiền (ca, lai, khac)
  const totals = records.reduce(
    (acc, record) => {
      acc.ca += record.ca;
      acc.lai += record.lai;
      acc.khac += record.khac;
      return acc;
    },
    { ca: 0, lai: 0, khac: 0 }
  );

  // Dữ liệu footer (hiển thị tổng các khoản tiền và thu về)
  const footer = [
    "Tổng",
    "",
    totals.ca.toLocaleString("vi-VN"),
    totals.lai.toLocaleString("vi-VN"),
    totals.khac.toLocaleString("vi-VN"),
    "",
  ];

  const rows = records.length + 3; // Số hàng: bao gồm tiêu đề + dữ liệu + footer

  const cellWidth = 120;
  const cellHeight = 50;
  const canvasWidth = columns * cellWidth;
  const canvasHeight = rows * cellHeight;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Vẽ nền trắng
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vẽ tiêu đề "Sổ chi tiết ca"
  const totalCa = (
    Number(totals.ca) +
    Number(totals.lai) +
    Number(totals.khac)
  ).toLocaleString("vi-VN");

  ctx.fillStyle = "#000"; // Màu chữ
  ctx.font = "18px Arial"; // Cỡ chữ
  ctx.fillText(`Sổ chi tiết ca | TC: ${totalCa}`, canvas.width / 3, 30); // Vẽ tiêu đề

  // Vẽ bảng
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#000"; // Màu chữ

  // Vẽ tiêu đề ở hàng đầu tiên (hàng 0)
  header.forEach((title, colIndex) => {
    const x = colIndex * cellWidth;
    const y = 50; // Hàng đầu tiên
    ctx.font = "bold 15px Arial";
    ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
    ctx.fillText(title, x + 10, y + 30); // Vẽ tiêu đề
  });

  // Vẽ dữ liệu từ records (hàng 2 đến hàng cuối cùng)
  records.forEach((record, rowIndex) => {
    const data = [
      (rowIndex + 1).toString(), // Số thứ tự (STT)
      record.name,
      record.ca.toLocaleString("vi-VN"),
      record.lai.toLocaleString("vi-VN"),
      record.khac.toLocaleString("vi-VN"),
      record.time,
    ];

    data.forEach((item, colIndex) => {
      const x = colIndex * cellWidth;
      const y = (rowIndex + 2) * cellHeight; // Hàng dữ liệu bắt đầu từ hàng 2
      ctx.font = "15px Arial";
      ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
      ctx.fillText(item, x + 10, y + 30); // Vẽ dữ liệu
    });
  });

  // Vẽ footer ở hàng cuối cùng
  footer.forEach((footerItem, colIndex) => {
    const x = colIndex * cellWidth;
    const y = (rows - 1) * cellHeight; // Hàng cuối cùng
    ctx.fillStyle = "#FF0000"; // Màu chữ footer
    ctx.font = "bold 16px Arial";
    ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung footer
    ctx.fillText(footerItem, x + 10, y + 30); // Vẽ dữ liệu footer
  });

  return canvas.toBuffer(); // Trả về buffer ảnh
}

// hàm vẽ bảng phí
function createTableImageListExpense(records) {
  const columns = 3; // Số lượng cột cố định (STT, Tên, Ca, Lai, Khác, Thời gian)
  const header = ["STT", "CHI TIẾT", "SỐ TIỀN"]; // Tiêu đề của bảng
  const totals = records.reduce((acc, record) => {
    acc += record.amount;

    return acc;
  }, 0);

  // Dữ liệu footer (hiển thị tổng các khoản tiền và thu về)
  const footer = ["Tổng", "", totals, ""];

  const rows = records.length + 3; // Số hàng: bao gồm tiêu đề + dữ liệu + footer

  const cellWidth = 120;
  const cellHeight = 50;
  const canvasWidth = columns * cellWidth;
  const canvasHeight = rows * cellHeight;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Vẽ nền trắng
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vẽ tiêu đề "Sổ chi tiết ca"
  ctx.fillStyle = "#000"; // Màu chữ
  ctx.font = "18px Arial"; // Cỡ chữ
  ctx.fillText("Sổ chi phí ngày", canvas.width / 3, 30); // Vẽ tiêu đề

  // Vẽ bảng
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#000"; // Màu chữ

  // Vẽ tiêu đề ở hàng đầu tiên (hàng 0)
  header.forEach((title, colIndex) => {
    const x = colIndex * cellWidth;
    const y = 50; // Hàng đầu tiên
    ctx.font = "bold 15px Arial";
    ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
    ctx.fillText(title, x + 10, y + 30); // Vẽ tiêu đề
  });

  // Vẽ dữ liệu từ records (hàng 2 đến hàng cuối cùng)
  records.forEach((record, rowIndex) => {
    const data = [
      (rowIndex + 1).toString(), // Số thứ tự (STT)
      record.name,
      record.amount.toLocaleString("vi-VN"),
    ];

    data.forEach((item, colIndex) => {
      const x = colIndex * cellWidth;
      const y = (rowIndex + 2) * cellHeight; // Hàng dữ liệu bắt đầu từ hàng 2
      ctx.font = "14px Arial";
      ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung
      ctx.fillText(item, x + 10, y + 30); // Vẽ dữ liệu
    });
  });

  // Vẽ footer ở hàng cuối cùng
  footer.forEach((footerItem, colIndex) => {
    const x = colIndex * cellWidth;
    const y = (rows - 1) * cellHeight; // Hàng cuối cùng
    ctx.fillStyle = "#FF0000"; // Màu chữ footer
    ctx.font = "bold 16px Arial";
    ctx.strokeRect(x, y, cellWidth, cellHeight); // Vẽ khung footer
    ctx.fillText(footerItem, x + 10, y + 30); // Vẽ dữ liệu footer
  });

  return canvas.toBuffer(); // Trả về buffer ảnh
}

// Xử lý lệnh /addca
bot.onText(/\/addca(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const msgText = match[0];

  // Kiểm tra cú pháp tin nhắn
  const parsedData = parseAddCaCommand(msgText);

  if (!parsedData) {
    // Nếu cú pháp không hợp lệ
    bot.sendMessage(
      chatId,
      "Cú pháp không hợp lệ. Vui lòng sử dụng: /addca <tên> c<số tiền> l<số tiền> k<số tiền>"
    );
    return;
  }

  // Lấy thời gian hiện tại
  const now = new Date();
  const time = now.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  if (!groupRecordsCa[chatId]) {
    groupRecordsCa[chatId] = [];
  }

  // Thêm thông tin vào mảng records
  groupRecordsCa[chatId].push({
    name: parsedData.name,
    ca: parsedData.ca,
    lai: parsedData.lai,
    khac: parsedData.khac,
    time: time,
  });

  // Phản hồi rằng đã thêm thông tin thành công
  bot.sendMessage(
    chatId,
    `_Đã thêm ca thành công\\._\nDùng cú pháp /check để kiểm tra lại thông tin\\.`,
    { parse_mode: "MarkdownV2" }
  );
});

// Xử lý lệnh /addphi
bot.onText(/\/addphi\s+(.+),(\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const msgText = match.input; // Tin nhắn người dùng gửi

  // Kiểm tra cú pháp
  const parsedData = parseAddPhiCommand(msgText);

  if (!parsedData) {
    // Nếu cú pháp không hợp lệ
    bot.sendMessage(
      chatId,
      "Cú pháp không hợp lệ. Vui lòng sử dụng: /addphi <tên chi phí>,<số tiền>"
    );
    return;
  }

  // Nếu chưa có groupRecordsPhi[chatId], khởi tạo mảng rỗng
  if (!groupRecordsPhi[chatId]) {
    groupRecordsPhi[chatId] = [];
  }

  // Kiểm tra xem tên chi phí đã tồn tại chưa
  const existingRecord = groupRecordsPhi[chatId].find(
    (record) => record.name === parsedData.name
  );

  if (existingRecord) {
    // Nếu chi phí đã tồn tại, tăng amount
    existingRecord.amount += parsedData.amount;
  } else {
    // Nếu chi phí chưa tồn tại, thêm mới
    groupRecordsPhi[chatId].push({
      name: parsedData.name,
      amount: parsedData.amount,
    });
  }

  // Phản hồi thông báo đã thêm chi phí thành công
  bot.sendMessage(
    chatId,
    `_Đã thêm chi phí thành công\\._\nDùng cú pháp /check để kiểm tra lại thông tin\\.`,
    { parse_mode: "MarkdownV2" }
  );
});

// Xử lý lệnh /check
bot.onText(/\/check/, (msg) => {
  const chatId = msg.chat.id;

  // Kiểm tra xem có dữ liệu nào không
  if (
    (!groupRecordsCa[chatId] || groupRecordsCa[chatId].length === 0) &&
    (!groupRecordsPhi[chatId] || groupRecordsPhi[chatId].length === 0)
  ) {
    bot.sendMessage(chatId, "Hiện chưa có thông tin nào.");
    return;
  }

  // Tạo chuỗi phản hồi cho Ca
  let responseCa = "<b>Thông tin sổ bạn như sau:</b>\n\n";
  if (!groupRecordsCa[chatId] || groupRecordsCa[chatId].length === 0) {
    responseCa += `Hiện chưa có thông tin Ca nào.\n`;
  } else {
    responseCa += `<b>Số ca</b>\n`;
    groupRecordsCa[chatId].forEach((record, index) => {
      responseCa += `<b>${index + 1}.</b> Tên: <code>${
        record.name
      }</code> | Tiền Ca: <code>${record.ca.toLocaleString(
        "vi-VN"
      )}</code> | Tiền Lai: <code>${record.lai.toLocaleString(
        "vi-VN"
      )}</code> | Tiền Khác: <code>${record.khac.toLocaleString(
        "vi-VN"
      )}</code>\nThời gian vào sổ: <code>${record.time}</code>\n\n`;
    });
  }

  // Tạo chuỗi phản hồi cho Phi
  let responsePhi = "<b>Chi phí:</b>\n";
  if (!groupRecordsPhi[chatId] || groupRecordsPhi[chatId].length === 0) {
    responsePhi += "Hiện chưa có chi phí nào.\n";
  } else {
    groupRecordsPhi[chatId].forEach((record, index) => {
      responsePhi += `<b>${
        index + 1
      }.</b> ${record.name.toLocaleString()} | <i>${record.amount.toLocaleString(
        "vi-VN"
      )}</i>\n`;
    });
  }

  // Gộp phản hồi của cả Ca và Phi
  const finalResponse = `${responseCa}\n${responsePhi}`;

  // Gửi phản hồi lại toàn bộ thông tin
  bot.sendMessage(chatId, finalResponse, { parse_mode: "HTML" });
});

//xử lí lệnh /total
bot.onText(/\/total/, (msg) => {
  const chatId = msg.chat.id;

  if (
    (!groupRecordsCa[chatId] || groupRecordsCa[chatId].length === 0) &&
    (!groupRecordsPhi[chatId] || groupRecordsPhi[chatId].length === 0)
  ) {
    bot.sendMessage(chatId, "Hiện chưa có thông tin nào.");
    return;
  }

  // Tính tổng Ca, Lai, và Khác
  let totalCa = 0,
    totalLai = 0,
    totalKhac = 0;

  groupRecordsCa[chatId]?.forEach((record) => {
    totalCa += record.ca;
    totalLai += record.lai;
    totalKhac += record.khac;
  });

  // Phản hồi tổng cộng
  const responseCa = `1. Tổng sổ hiện tại thu về:\nCa: ${totalCa.toLocaleString(
    "vi-VN"
  )}\nLai: ${totalLai.toLocaleString(
    "vi-VN"
  )}\nKhác: ${totalKhac.toLocaleString("vi-VN")}\nTC = ${(
    totalCa +
    totalLai +
    totalKhac
  ).toLocaleString("vi-VN")}`;

  let total = calculateTotal(groupRecordsPhi[chatId] || []);

  let responsePhi = "2. Tổng chi phí ngày:\n";
  if (!groupRecordsPhi[chatId] || groupRecordsPhi[chatId].length === 0) {
    responsePhi += `Hiện chưa có chi phí.\n`;
    total = 0;
  } else {
    groupRecordsPhi[chatId].forEach((record) => {
      responsePhi += `${record.name}: ${record.amount.toLocaleString(
        "vi-VN"
      )}\n`;
    });
    responsePhi += `TC = ${total.toLocaleString("vi-VN")}`;
  }

  // Tính toán tổng cuối ngày
  const responseTotal = (totalCa + totalLai + totalKhac - total).toLocaleString(
    "vi-VN"
  );

  const response = `<pre>${responseCa}\n\n${responsePhi}\n\n**Tổng sổ cuối ngày: ${responseTotal}</pre>`;

  bot.sendMessage(chatId, response, { parse_mode: "HTML" });
});
//Lệnh img để xuất ảnh
bot.onText(/\/img/, (msg) => {
  process.emitWarning = () => {};
  const chatId = msg.chat.id;
  // Kiểm tra dữ liệu ca (SeaFood)
  if (!groupRecordsCa[chatId] || groupRecordsCa[chatId].length === 0) {
    bot.sendMessage(chatId, "Hiện chưa có thông tin ca nào.");
  } else {
    const imageBuffer = createTableImageListSeaFood(groupRecordsCa[chatId]);
    bot.sendPhoto(chatId, imageBuffer);
  }

  // Kiểm tra dữ liệu chi phí (Expense)
  if (!groupRecordsPhi[chatId] || groupRecordsPhi[chatId].length === 0) {
    bot.sendMessage(chatId, "Hiện chưa có thông tin chi phí nào.");
  } else {
    const imageBufferCur = createTableImageListExpense(groupRecordsPhi[chatId]);
    bot.sendPhoto(chatId, imageBufferCur);
  }
});

// Lệnh /start để khởi động bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || "Người dùng";
  bot.sendMessage(
    chatId,
    `Chào mừng bạn! <b>${userName}</b>\n\nNếu bạn chưa biết cách sử dụng Bot hãy dùng cú pháp /help để xem hướng dẫn sử dụng.\n\n<b>Cú pháp thêm</b>\n<code>/addca </code>\n<code>/addphi </code>`,
    {
      parse_mode: "HTML",
    }
  );
});

bot.onText(/\/help/, (msg) => {
  process.emitWarning = () => {};
  const chatId = msg.chat.id;
  const filePath = "./images/help.png";
  bot.sendPhoto(chatId, fs.createReadStream(filePath));
});

bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;
  const keyboard = [
    [
      {
        text: "Xác nhận",
        callback_data: `confirm`,
      },
      {
        text: "Hủy bỏ",
        callback_data: `cancel`,
      },
    ],
  ];

  bot.sendMessage(
    chatId,
    `<b>Bạn có muốn xóa sổ đã lưu?</b>\n<i>Lưu ý: Bạn sẽ không phục hồi được báo cáo khi bấm xác nhận xóa.</i>`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard },
    }
  );
});

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message; // Lấy message từ callbackQuery
  const chatId = msg.chat.id; // Lấy chatId từ message
  const data = callbackQuery.data; // Lấy callback_data
  const action = data; // Không cần destructuring

  if (action === "confirm") {
    // Xóa dữ liệu
    groupRecordsCa[chatId] = [];
    groupRecordsPhi[chatId] = [];
    bot.deleteMessage(chatId, msg.message_id);
    bot.sendMessage(chatId, `<i>Đã xóa báo cáo!</i>`, {
      parse_mode: "HTML",
    });
  } else if (action === "cancel") {
    // Xóa message xác nhận khi người dùng chọn "Hủy bỏ"
    bot.deleteMessage(chatId, msg.message_id);
    bot.sendMessage(chatId, `<i>Đã hủy hành động xóa!</i>`, {
      parse_mode: "HTML",
    });
  }
});

bot.setWebHook(
  `https://telegram-bot-seafood-app-3e45e316bf10.herokuapp.com/${token}`
);
