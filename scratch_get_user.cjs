const https = require('https');

https.get('https://ar-vision-link.onrender.com/api/users', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const user = json.users.find(u => u.name.includes("統神") || u.name.includes("張嘉航") || u.nickname.includes("統神"));
      if (user) {
        console.log(JSON.stringify(user, null, 2));
      } else {
        console.log("User not found!");
      }
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
