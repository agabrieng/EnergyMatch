// Função para validar CPF
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = remainder >= 10 ? 0 : remainder;
  
  if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = remainder >= 10 ? 0 : remainder;
  
  return digit2 === parseInt(cleanCPF.charAt(10));
}

// Função para validar CNPJ
export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return digit2 === parseInt(cleanCNPJ.charAt(13));
}

// Função para formatar CPF
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para formatar CNPJ
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Função para aplicar máscara durante a digitação
export function applyDocumentMask(value: string, isCNPJ: boolean): string {
  const cleanValue = value.replace(/\D/g, '');
  
  if (isCNPJ) {
    // Máscara CNPJ: 00.000.000/0000-00
    if (cleanValue.length <= 2) return cleanValue;
    if (cleanValue.length <= 5) return cleanValue.replace(/(\d{2})(\d)/, '$1.$2');
    if (cleanValue.length <= 8) return cleanValue.replace(/(\d{2})(\d{3})(\d)/, '$1.$2.$3');
    if (cleanValue.length <= 12) return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5');
  } else {
    // Máscara CPF: 000.000.000-00
    if (cleanValue.length <= 3) return cleanValue;
    if (cleanValue.length <= 6) return cleanValue.replace(/(\d{3})(\d)/, '$1.$2');
    if (cleanValue.length <= 9) return cleanValue.replace(/(\d{3})(\d{3})(\d)/, '$1.$2.$3');
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4');
  }
}

// Função para validar documento baseado no tipo
export function validateDocument(document: string, isCNPJ: boolean): boolean {
  return isCNPJ ? validateCNPJ(document) : validateCPF(document);
}