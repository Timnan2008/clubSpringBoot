-- ============================================================================
-- Fix: 意见箱「历史记录」/ 后台列表 500
--
-- 背景：tb_suggestions.is_pass 列是在表中已有数据之后才加上去的，导致历史行该列为
--       NULL。旧版本 Suggestion 实体把 is_pass 映射为 primitive boolean，
--       读取到 NULL 时 Hibernate 抛异常
--         “Null value was assigned to a property ... isPass ... of primitive type”
--       于是 GET /api/suggestion/pass_only（历史记录页）与后台 /api/suggestion/all
--       全部报 500，页面显示“暂无历史记录”。
--
-- 本脚本把存量 NULL 归一化为 0（等价于“未通过”），配合实体改用 Boolean（可空）类型，
-- 即使以后再出现 NULL 也不会再导致 500。
-- ============================================================================

-- 1) 存量数据修复（幂等，可重复执行）
UPDATE tb_suggestions SET is_pass = 0 WHERE is_pass IS NULL;

-- 2)（可选）收紧表结构，杜绝再次出现 NULL
-- ALTER TABLE tb_suggestions MODIFY is_pass TINYINT(1) NOT NULL DEFAULT 0;
