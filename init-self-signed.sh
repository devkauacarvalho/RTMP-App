#!/bin/bash
# =================================================================
# Script de Inicialização SSL (Certificado Auto-assinado)
# =================================================================
# ATENÇÃO: Como você não possui um domínio, este script gerará um
# certificado SSL auto-assinado. O PWA e o HTTPS funcionarão, mas
# o navegador exibirá um alerta de segurança ("Conexão não segura")
# que você precisará ignorar manualmente.
# =================================================================

IP="localhost"

echo "==================================================="
echo "  Inicializando SSL Auto-assinado para IP: $IP"
echo "==================================================="

# Diretórios para os certificados auto-assinados
mkdir -p ./nginx/ssl

# Gerar chave privada e certificado auto-assinado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ./nginx/ssl/nginx-selfsigned.key \
    -out ./nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=BR/ST=Estado/L=Cidade/O=Petshop/CN=$IP"

echo ""
echo "✅ Certificado auto-assinado gerado em ./nginx/ssl/"
echo ""
echo "🚀 Subindo todos os serviços..."
docker compose up -d
echo ""
echo "Acesse: https://$IP"
echo "Nota: O navegador mostrará um aviso de segurança. Clique em 'Avançado' e depois em 'Ir para $IP (inseguro)'."
