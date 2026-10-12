package com.course.backend.modules.auth.service.impl;

import cn.hutool.core.lang.UUID;
import com.xingheyiye.xingye.kit.notify.MailClient;
import com.xingheyiye.xingye.kit.notify.MailMessage;
import com.xingheyiye.xingye.kit.notify.SendResult;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/12
 */

@Component
@Slf4j
public class SmtpMailClientImpl implements MailClient {
    private final JavaMailSender mailSender;
    private final String from;

    public SmtpMailClientImpl(JavaMailSender mailSender,
                              @Value("${spring.mail.username}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public SendResult send(MailMessage message) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(from);
            helper.setTo(message.getTo().toArray(new String[0]));
            helper.setSubject(message.getSubject());

            helper.setText(message.getContent(), message.isHtml());

            mailSender.send(mimeMessage);

            log.debug("邮件发送成功，收件人：{}", message.getTo());
            return SendResult.ok(UUID.randomUUID().toString());
        } catch (Exception e) {
            log.error("邮件发送失败，收件人：{}", message.getTo(), e);
            return SendResult.fail("MAIL_SEND_FAILED", "邮件发送失败：" + e.getMessage());
        }
    }
}
