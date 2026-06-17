const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const startToken = '{/* STALE_SIDE_BAR_REMOVED */}';
const endToken = '{/* 🧾 ذيل المنصة ومساحة الإرشاد */}';

const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  let head = code.slice(0, startIndex);
  let tail = code.slice(endIndex);
  
  const insert = `
        </>
      )}

      `;
  
  fs.writeFileSync('src/App.tsx', head + insert + tail);
  console.log("Successfully cleaned up STALE_SIDE_BAR_REMOVED");
} else {
  console.log("Tokens not found", startIndex, endIndex);
}
