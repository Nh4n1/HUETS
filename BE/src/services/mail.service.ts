import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 587);

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
})[character] ?? character);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendRegistrationVerificationCode = async (
  to: string,
  displayName: string,
  otp: string,
) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Mã xác thực đăng ký HueTrip',

    // Fallback nếu email client không render HTML
    text: [
      `Xin chào ${displayName},`,
      '',
      'Cảm ơn bạn đã đăng ký HueTrip.',
      '',
      `Mã xác thực của bạn là: ${otp}`,
      '',
      'Mã có hiệu lực trong 10 phút.',
      'Vui lòng không chia sẻ mã này với bất kỳ ai.',
      '',
      'Nếu bạn không thực hiện đăng ký này, bạn có thể bỏ qua email.',
      '',
      'HueTrip',
    ].join('\n'),

    html: `
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Xác thực đăng ký HueTrip</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            font-family: Arial, Helvetica, sans-serif;
            color: #262626;
          "
        >
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="background-color: #f5f5f5; padding: 32px 16px;"
          >
            <tr>
              <td align="center">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    max-width: 560px;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #eeeeee;
                  "
                >

                  <!-- Header -->
                  <tr>
                    <td
                      style="
                        padding: 28px 32px 20px;
                        text-align: center;
                      "
                    >
                      <div
                        style="
                          font-size: 26px;
                          font-weight: 700;
                          color: #d48806;
                          margin-bottom: 8px;
                        "
                      >
                        HueTrip
                      </div>

                      <div
                        style="
                          font-size: 14px;
                          color: #8c8c8c;
                        "
                      >
                        Khám phá Huế theo cách của bạn
                      </div>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 8px 32px 32px;">
                      <h2
                        style="
                          margin: 0 0 20px;
                          font-size: 22px;
                          line-height: 1.4;
                          color: #262626;
                        "
                      >
                        Xác thực địa chỉ email
                      </h2>

                      <p
                        style="
                          margin: 0 0 16px;
                          font-size: 15px;
                          line-height: 1.7;
                        "
                      >
                        Xin chào <strong>${displayName}</strong>,
                      </p>

                      <p
                        style="
                          margin: 0 0 24px;
                          font-size: 15px;
                          line-height: 1.7;
                          color: #595959;
                        "
                      >
                        Cảm ơn bạn đã đăng ký tài khoản HueTrip.
                        Vui lòng sử dụng mã dưới đây để xác thực địa chỉ email
                        và hoàn tất quá trình đăng ký.
                      </p>

                      <!-- OTP -->
                      <div
                        style="
                          background-color: #fff7e6;
                          border: 1px solid #ffd591;
                          border-radius: 10px;
                          padding: 24px;
                          text-align: center;
                          margin-bottom: 24px;
                        "
                      >
                        <div
                          style="
                            font-size: 13px;
                            color: #8c8c8c;
                            margin-bottom: 10px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                          "
                        >
                          Mã xác thực
                        </div>

                        <div
                          style="
                            font-size: 36px;
                            font-weight: 700;
                            letter-spacing: 8px;
                            color: #d48806;
                          "
                        >
                          ${otp}
                        </div>
                      </div>

                      <p
                        style="
                          margin: 0 0 8px;
                          font-size: 14px;
                          line-height: 1.6;
                          color: #595959;
                        "
                      >
                        Mã xác thực có hiệu lực trong
                        <strong>10 phút</strong>.
                      </p>

                      <p
                        style="
                          margin: 0 0 24px;
                          font-size: 14px;
                          line-height: 1.6;
                          color: #595959;
                        "
                      >
                        Vui lòng không chia sẻ mã này với bất kỳ ai.
                      </p>

                      <div
                        style="
                          height: 1px;
                          background-color: #f0f0f0;
                          margin: 24px 0;
                        "
                      ></div>

                      <p
                        style="
                          margin: 0;
                          font-size: 13px;
                          line-height: 1.6;
                          color: #8c8c8c;
                        "
                      >
                        Nếu bạn không thực hiện đăng ký tài khoản HueTrip,
                        bạn có thể bỏ qua email này.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td
                      style="
                        padding: 20px 32px;
                        background-color: #fafafa;
                        text-align: center;
                        font-size: 12px;
                        color: #8c8c8c;
                      "
                    >
                      © HueTrip · Nền tảng khám phá du lịch Huế
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
};

export const sendPasswordResetCode = async (
  to: string,
  displayName: string,
  otp: string,
) => {
  const safeDisplayName = escapeHtml(displayName);
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Mã đặt lại mật khẩu HueTrip',
    text: [
      `Xin chào ${displayName},`,
      '',
      'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản HueTrip của bạn.',
      '',
      `Mã xác thực: ${otp}`,
      '',
      'Mã có hiệu lực trong 10 phút.',
      'Không chia sẻ mã này với bất kỳ ai.',
      '',
      'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.',
      '',
      'HueTrip',
    ].join('\n'),
    html: `
      <!doctype html>
      <html lang="vi">
        <body style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Arial,sans-serif;color:#262626">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
            <div style="padding:28px 32px 20px;text-align:center">
              <div style="font-size:26px;font-weight:700;color:#d48806">HueTrip</div>
              <div style="margin-top:8px;font-size:14px;color:#8c8c8c">Khám phá Huế theo cách của bạn</div>
            </div>
            <div style="padding:8px 32px 32px">
              <h2 style="margin:0 0 20px;font-size:22px">Đặt lại mật khẩu</h2>
              <p style="font-size:15px;line-height:1.7">Xin chào <strong>${safeDisplayName}</strong>,</p>
              <p style="font-size:15px;line-height:1.7;color:#595959">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản HueTrip của bạn.</p>
              <div style="margin:24px 0;padding:24px;text-align:center;background:#fff7e6;border:1px solid #ffd591;border-radius:10px">
                <div style="margin-bottom:10px;font-size:13px;color:#8c8c8c;text-transform:uppercase;letter-spacing:1px">Mã xác thực</div>
                <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#d48806">${otp}</div>
              </div>
              <p style="font-size:14px;line-height:1.6;color:#595959">Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
              <p style="margin-top:24px;padding-top:24px;border-top:1px solid #f0f0f0;font-size:13px;line-height:1.6;color:#8c8c8c">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
};
