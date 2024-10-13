const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment"); // Để lấy thời gian hiện tại
require("dotenv").config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const commands = [
  { command: "start", description: "Bắt đầu sử dụng bot" },
  { command: "check", description: "Xem danh sách ca đã lưu" },
  { command: "total", description: "Xem tổng số tiền sổ đã thu" },
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

bot.on("polling_error", (error) => {
  console.log("Lỗi polling:", error);
});

let groupRecords = {};

// Hàm xử lý cú pháp tin nhắn
const parseAddCommand = (msgText) => {
  const regex = /\/add (\w+)(.*)/;
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

// Xử lý lệnh /add
bot.onText(/\/add(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const msgText = match[0];

  // Kiểm tra cú pháp tin nhắn
  const parsedData = parseAddCommand(msgText);

  if (!parsedData) {
    // Nếu cú pháp không hợp lệ
    bot.sendMessage(
      chatId,
      "Cú pháp không hợp lệ. Vui lòng sử dụng: /add <tên> c<số tiền> l<số tiền> k<số tiền>"
    );
    return;
  }

  // Lấy thời gian hiện tại
  const time = moment().format("HH:mm:ss");

  if (!groupRecords[chatId]) {
    groupRecords[chatId] = [];
  }

  // Thêm thông tin vào mảng records
  groupRecords[chatId].push({
    name: parsedData.name,
    ca: parsedData.ca,
    lai: parsedData.lai,
    khac: parsedData.khac,
    time: time,
  });

  // Phản hồi rằng đã thêm thông tin thành công
  bot.sendMessage(
    chatId,
    `_Đã thêm:_\n\nTên: ${parsedData.name} \\| Ca: ${parsedData.ca} \\| Lai: ${parsedData.lai} \\| Khác: ${parsedData.khac}`,
    { parse_mode: "MarkdownV2" }
  );
});

// Xử lý lệnh /total
bot.onText(/\/check/, (msg) => {
  const chatId = msg.chat.id;

  if (!groupRecords[chatId] || groupRecords[chatId].length === 0) {
    bot.sendMessage(chatId, "Hiện chưa có thông tin nào.");
    return;
  }

  // Tạo chuỗi phản hồi chứa toàn bộ thông tin
  let response = "Thông tin sổ bạn như sau:\n";
  groupRecords[chatId].forEach((record, index) => {
    response += `<b>${index + 1}.</b>\n<b>Tên</b> <code>${
      record.name
    }</code> | <b>Tiền ca</b> <code>${record.ca.toLocaleString(
      "vi-VN"
    )}</code> | <b>Tiền lai</b> <code>${record.lai.toLocaleString(
      "vi-VN"
    )}</code> | <b>Tiền khác</b> <code>${record.khac.toLocaleString(
      "vi-VN"
    )}</code>\n<b>Thời gian</b> <code>${record.time}</code>\n
    
  `;
  });

  // Gửi phản hồi lại toàn bộ thông tin
  bot.sendMessage(chatId, response, { parse_mode: "HTML" });
});

// Xử lý lệnh /check
bot.onText(/\/total/, (msg) => {
  const chatId = msg.chat.id;

  if (!groupRecords[chatId] || groupRecords[chatId].length === 0) {
    bot.sendMessage(chatId, "Hiện chưa có thông tin nào.");
    return;
  }

  // Tính tổng Ca, Lai, và Khác
  let totalCa = 0,
    totalLai = 0,
    totalKhac = 0;

  groupRecords[chatId].forEach((record) => {
    totalCa += record.ca;
    totalLai += record.lai;
    totalKhac += record.khac;
  });

  // Phản hồi tổng cộng
  const response = `<pre>Tổng sổ hiện tại thu về:\n\nCa: ${totalCa.toLocaleString(
    "vi-VN"
  )}\nLai: ${totalLai.toLocaleString(
    "vi-VN"
  )}\nKhác: ${totalKhac.toLocaleString("vi-VN")}\nTC = ${(
    totalCa +
    totalLai +
    totalKhac
  ).toLocaleString("vi-VN")}</pre>`;
  bot.sendMessage(chatId, response, { parse_mode: "HTML" });
});

// Lệnh /start để khởi động bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Chào mừng bạn!\nDùng cú pháp /add <b>[tên] c[số tiền] l[số tiền] k[số tiền]</b> để thêm thông tin.\nDùng cú pháp /total để xem tổng số tiền sổ hiện tai.\nDùng cú pháp /check để kiểm tra danh sách ca hiện tai\n\nVí dụ : <code>/add at c3000 l300 k1500</code>\n\nTương ứng :\n<i>Khách : AT , Tiền ca : 3000 , Tiền lai 300 , tiền khác 1500</i>
    `,
    {
      parse_mode: "HTML",
    }
  );
});

bot.onText(/\/clear/, (msg) => {
  const chatId = msg.chat.id;

  groupRecords[chatId] = [];

  bot.sendMessage(chatId, `<i>Sổ của bạn đã được xóa</i>`, {
    parse_mode: "HTML",
  });
});

bot.setWebHook(`https://still-lake-11391-4452ebd5c0cc.herokuapp.com/${token}`);
