-- 用户自选文本模型偏好：供应商 + 具体模型 ID，均为空表示跟随系统默认
ALTER TABLE `user` ADD COLUMN `preferred_text_provider` TEXT;
ALTER TABLE `user` ADD COLUMN `preferred_text_model` TEXT;
