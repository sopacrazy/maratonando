import React, { useState, useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AppContext } from '../App';
import { supabase } from '../lib/supabase';

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PIX_KEY = "seu-pix-aqui@exemplo.com"; // Substituir por chave real em produção

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({ isOpen, onClose }) => {
  const { user, setCoins } = useContext(AppContext);
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [amount, setAmount] = useState<number>(0);
  const [coinsToAdd, setCoinsToAdd] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [simulating, setSimulating] = useState(false);

  if (!isOpen) return null;

  const packages = [
    { price: 10, coins: 1000 },
    { price: 20, coins: 2100, bonus: '5%' },
    { price: 50, coins: 5500, bonus: '10%' },
    { price: 100, coins: 12000, bonus: '20%' },
  ];

  const handleSelect = (pkg: typeof packages[0]) => {
    setAmount(pkg.price);
    setCoinsToAdd(pkg.coins);
    setStep('payment');
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(`00020126580014BR.GOV.BCB.PIX...`); // Payload fictício
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const simulatePayment = async () => {
    setSimulating(true);
    // Simular delay de processamento bancário
    setTimeout(async () => {
      try {
        // Atualizar saldo no banco
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', user.id)
          .single();

        const newBalance = (profile?.coins || 0) + coinsToAdd;

        const { error } = await supabase
          .from('profiles')
          .update({ coins: newBalance })
          .eq('id', user.id);

        if (error) throw error;

        // Atualizar contexto local
        setCoins(newBalance);
        setStep('success');
      } catch (err) {
        alert('Erro ao processar pagamento simulado');
        console.error(err);
      } finally {
        setSimulating(false);
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10">
        
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="text-center text-white">
            <div className="size-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
               <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <h2 className="text-xl font-bold">Adicionar Créditos</h2>
            <p className="text-white/80 text-sm">Compre moedas via PIX</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500 dark:text-text-secondary text-center mb-2">Escolha um pacote de moedas:</p>
              {packages.map(pkg => (
                <button
                  key={pkg.price}
                  onClick={() => handleSelect(pkg)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {pkg.coins.toLocaleString()} 🪙
                      {pkg.bonus && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">{pkg.bonus} BÔNUS</span>}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-text-secondary">R$ {(pkg.price / pkg.coins).toFixed(4)} por moeda</span>
                  </div>
                  <span className="font-bold text-primary text-xl">R$ {pkg.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'payment' && (
            <div className="flex flex-col items-center animate-in slide-in-from-right-10 duration-300">
              <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6">
                 <QRCodeSVG value={`00020126580014BR.GOV.BCB.PIX0114+551199999999520400005303986540${amount.toFixed(2)}5802BR5913maratonando App6009Sao Paulo62070503***6304`} size={200} />
              </div>
              
              <div className="text-center mb-6">
                <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">Pagamento via PIX</p>
                <p className="text-slate-500 dark:text-text-secondary text-sm mb-4">Escaneie o QR Code ou copie a chave abaixo</p>
                <h3 className="text-2xl font-black text-primary mb-1">R$ {amount.toFixed(2)}</h3>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCopyPix}
                  className="flex-1 py-3 border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                  {copySuccess ? 'Copiado!' : 'Copiar Chave'}
                </button>
                <button
                  onClick={simulatePayment}
                  disabled={simulating}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Apenas em modo de teste"
                >
                  {simulating ? 'Processando...' : 'Simular Pagamento'}
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4">*Este é um ambiente de demonstração. O pagamento será simulado.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center text-center animate-in zoom-in duration-300 py-8">
              <div className="size-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-500">
                <span className="material-symbols-outlined text-5xl">check_circle</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pagamento Confirmado!</h3>
              <p className="text-slate-600 dark:text-text-secondary mb-8">
                Você recebeu <strong>{coinsToAdd.toLocaleString()} moedas</strong> na sua carteira.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Voltar para Loja
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
