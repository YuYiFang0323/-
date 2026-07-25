export default async function handler(req, res) {
  const { code } = req.query;

  // 1. 如果沒有 code，導向 GitHub 授權頁面
  if (!code) {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.OAUTH_CLIENT_ID}&scope=repo,user`;
    return res.redirect(authUrl);
  }

  // 2. 用 code 換取 Access Token
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    const token = data.access_token;

    // 3. 回傳 script 給 Decap CMS 接收 token
    const script = `
      <script>
        (function() {
          function recieveMessage(e) {
            console.log("recieveMessage", e);
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({ token, provider: 'github' })}',
              e.origin
            );
          }
          window.addEventListener("message", recieveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        })()
      </script>
    `;

    return res.status(200).send(script);
  } catch (error) {
    return res.status(500).send(error.message);
  }
}
