-- 用户自选图片/语音/视频模型偏好：供应商 + 具体模型 ID，均为空表示跟随系统默认
-- 仅付费用户（有效订阅/管理员/root）允许设置，且受 ai_permissions 服务位约束
ALTER TABLE `user` ADD COLUMN `preferred_image_provider` TEXT;
ALTER TABLE `user` ADD COLUMN `preferred_image_model` TEXT;
ALTER TABLE `user` ADD COLUMN `preferred_tts_provider` TEXT;
ALTER TABLE `user` ADD COLUMN `preferred_tts_model` TEXT;
ALTER TABLE `user` ADD COLUMN `preferred_video_provider` TEXT;
ALTER TABLE `user` ADD COLUMN `preferred_video_model` TEXT;
