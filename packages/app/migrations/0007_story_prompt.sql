-- 为 Games 表添加 story_prompt 字段，用于存储 AI 故事导入器的内容
ALTER TABLE Games ADD COLUMN story_prompt TEXT;
