import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "../../components/Navigation";

const ArenaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 md:pb-0">
      <Navigation page="feed" />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/clubes/${id}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white">
              arrow_back
            </span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Arena
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-8 shadow-lg w-full max-w-6xl">
            <div className="text-center">
              <img
                src="/arena-em-breve.jpg"
                alt="Arena em breve"
                className="w-full h-auto rounded-lg mb-6 mx-auto"
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
                onError={(e) => {
                  // Fallback se a imagem não for encontrada
                  console.error("Imagem não encontrada: /arena-em-breve.jpg");
                  e.currentTarget.style.display = "none";
                }}
              />
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Arena em Breve
              </h2>
              <p className="text-slate-600 dark:text-text-secondary mb-6 text-lg">
                Estamos preparando algo incrível para você! Em breve você poderá
                competir e se divertir na Arena do Clube.
              </p>
              <button
                onClick={() => navigate(`/clubes/${id}`)}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Voltar ao Clube
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArenaPage;
