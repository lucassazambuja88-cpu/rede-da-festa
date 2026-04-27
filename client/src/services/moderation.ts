const suspiciousTerms = [
  "otario",
  "idiota",
  "vadia",
  "burro",
  "imbecil",
  "escroto",
  "matar",
  "estupr",
];

export function runModeration(content: string) {
  const normalized = content.toLowerCase();
  const found = suspiciousTerms.some((term) => normalized.includes(term));

  if (!found) {
    return { flagged: false, warning: "" };
  }

  return {
    flagged: true,
    warning:
      "Essa mensagem parece agressiva ou inadequada. Revise o texto antes de enviar para manter a seguranca da Rede da Festa.",
  };
}

