package com.course.backend.modules.auth.service.impl;

import com.course.backend.modules.auth.service.EmailService;
import com.xingheyiye.xingye.kit.notify.MailClient;
import com.xingheyiye.xingye.kit.notify.MailMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/12
 */

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {
    private final MailClient mailClient;

    @Async
    @Override
    public void sendResetCodeAsync(String email, String code) {
        try {
            // 1. 构建 MailMessage
            MailMessage message = MailMessage.builder()
                    .to(email)
                    .subject("【智能课程助教平台】密码重置验证码")
                    .content(buildEmailContent(code))
                    .html(true)
                    .build();

            // 2. 发送
            mailClient.send(message);

            log.debug("重置密码邮件已处理，目标邮箱：{}", email);
        } catch (Exception e) {
            // 防枚举：发信失败只打日志，绝不上抛
            log.error("发送重置密码邮件异常，email={}", email, e);
        }
    }

    private String buildEmailContent(String code) {
        return "<!DOCTYPE html>"
                + "<html lang=\"zh-CN\">"
                + "<head><meta charset=\"UTF-8\"></head>"
                + "<body style=\"margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f5f5f5;padding:40px 0;\">"
                + "<tr><td align=\"center\">"
                + "<table width=\"520\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);\">"

                // 头部
                + "<tr><td style=\"background:linear-gradient(135deg,#4f7cff,#6c5ce7);padding:32px 24px;text-align:center;\">"
                + "<h1 style=\"margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:1px;\">智能课程助教平台</h1>"
                + "</td></tr>"

                // 正文
                + "<tr><td style=\"padding:36px 32px;\">"
                + "<p style=\"margin:0 0 16px;font-size:16px;color:#333333;line-height:1.6;\">您好，</p>"
                + "<p style=\"margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;\">您正在申请重置账户密码，请使用以下验证码完成操作：</p>"

                // 验证码
                + "<div style=\"text-align:center;margin:32px 0;\">"
                + "<span style=\"display:inline-block;padding:16px 36px;background-color:#f0f4ff;border:2px dashed #4f7cff;border-radius:8px;font-size:32px;font-weight:700;letter-spacing:8px;color:#4f7cff;font-family:'Courier New',monospace;\">" + code + "</span>"
                + "</div>"

                // 提示
                + "<p style=\"margin:0 0 12px;font-size:14px;color:#888888;line-height:1.6;\">⏰ 验证码有效期为 <strong style=\"color:#e74c3c;\">5分钟</strong>，请勿泄露给他人。</p>"
                + "<p style=\"margin:0 0 24px;font-size:13px;color:#bbbbbb;line-height:1.6;\">如果这不是您的操作，请忽略此邮件，您的账户安全不会受到影响。</p>"

                // 分割线
                + "<hr style=\"border:none;border-top:1px solid #eeeeee;margin:24px 0;\">"
                + "<p style=\"margin:0;font-size:12px;color:#cccccc;text-align:center;\">© 2026 智能课程助教平台 · 此邮件由系统自动发送，请勿直接回复</p>"

                + "</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body></html>";
    }
}
