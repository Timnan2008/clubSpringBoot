import { HugeiconsIcon } from "@hugeicons/react";
import { Atom01Icon } from "@hugeicons/core-free-icons";
import GlideSelect from "./GlideSelect";
import { tx } from "./language";
import "./AssistantOptions.css";

export default function AssistantOptions({
  models = [],
  model,
  onModelChange,
  reasoning,
  onReasoningChange,
  disabled = false,
}) {
  const mimo = model === "mimo";
  const options = models.map((item) => ({
    value: item.id,
    label: item.label,
    detail:
      item.detail ||
      (item.id === "flash"
        ? tx("日常问答，响应更快", "Faster everyday answers")
        : tx("复杂任务，分析更深入", "Deeper analysis for complex tasks")),
    tag: item.disabled ? tx("暂未开放", "Unavailable") : undefined,
    disabled: Boolean(item.disabled),
  }));
  return (
    <div className="assistant-options">
      <GlideSelect
        className="assistant-options__select"
        options={options}
        value={model}
        onChange={onModelChange}
        disabled={disabled}
        ariaLabel={tx("选择模型", "Choose model")}
        surfaceColor="rgba(255,255,255,.08)"
        highlightColor="#41474c"
        textColor="#f0f2f3"
        accentColor="#eaf2f5"
        size="sm"
        radius={10}
        menuWidth={300}
        placement="top"
        align="left"
      />
      <button
        type="button"
        className="assistant-options__reason"
        disabled={disabled || mimo}
        aria-pressed={mimo ? undefined : reasoning}
        title={
          mimo
            ? tx("MiMo 的推理由模型自动控制", "MiMo controls its own reasoning")
            : tx("切换深度思考", "Toggle deep thinking")
        }
        onClick={() => onReasoningChange?.(!reasoning)}
      >
        <HugeiconsIcon icon={Atom01Icon} size={16} strokeWidth={1.8} />
        {mimo ? tx("自动思考", "Auto thinking") : tx("深度思考", "DeepThink")}
      </button>
    </div>
  );
}
