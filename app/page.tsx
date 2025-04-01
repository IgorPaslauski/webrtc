import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(null);
  const localVideoContainerRef = useRef(null);

  useEffect(() => {
    // Carregar scripts externos (Socket.IO e script.js)
    const script1 = document.createElement("script");
    script1.src = "/socket.io/socket.io.js";
    document.body.appendChild(script1);

    const script2 = document.createElement("script");
    script2.src = "/script.js";
    document.body.appendChild(script2);

    // Posicionamento inicial do vídeo local
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.style.left = "auto";
      localVideoContainerRef.current.style.right = "1rem";
      localVideoContainerRef.current.style.bottom = "4rem";
      localVideoContainerRef.current.style.top = "auto";
    }

    // Gerenciar placeholder
    const remoteVideos = remoteVideosRef.current;
    if (remoteVideos && !remoteVideos.querySelector("video")) {
      remoteVideos.innerHTML = `
        <div class="remote-video-placeholder flex flex-col items-center justify-center h-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
          <i class="fas fa-users text-2xl text-gray-400 mb-2"></i>
          <h3 class="text-base font-medium text-gray-600 dark:text-gray-400 mb-1">Nenhuma chamada</h3>
          <p class="text-gray-500 dark:text-gray-500 text-sm">Inicie uma chamada</p>
        </div>`;
    }
  }, []);

  // Função para alternar sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Lógica de arraste (mesma do HTML)
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  const startDragging = (e) => {
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;

    if (e.target.closest(".draggable")) {
      isDragging = true;
    }
  };

  const drag = (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      const maxX =
        window.innerWidth - localVideoContainerRef.current.offsetWidth;
      const maxY =
        window.innerHeight - localVideoContainerRef.current.offsetHeight - 60;

      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      localVideoContainerRef.current.style.left = currentX + "px";
      localVideoContainerRef.current.style.top = currentY + "px";
      localVideoContainerRef.current.style.right = "auto";
      localVideoContainerRef.current.style.bottom = "auto";
    }
  };

  const stopDragging = () => {
    isDragging = false;
  };

  useEffect(() => {
    const localVideoContainer = localVideoContainerRef.current;
    if (localVideoContainer) {
      localVideoContainer.addEventListener("mousedown", startDragging);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", stopDragging);

      // Limpeza de eventos
      return () => {
        localVideoContainer.removeEventListener("mousedown", startDragging);
        document.removeEventListener("mousemove", drag);
        document.removeEventListener("mouseup", stopDragging);
      };
    }
  }, []);

  return (
    <div className="flex h-screen">
      <Head>
        <title>Ultra Bagual Video</title>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </Head>

      <aside
        className={`sidebar w-72 bg-dark-darker text-light flex flex-col border-r border-gray-700/50 h-full z-40 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "fixed" : "absolute"
        } ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="brand flex items-center p-3 space-x-2 bg-gradient-to-r from-primary-dark to-primary">
          <i className="fas fa-video text-white text-xl"></i>
          <span className="text-xl font-bold text-white">Ultra Bagual</span>
        </div>

        <div className="user-panel p-2 glass-effect mx-2 mt-2 rounded-lg shadow">
          <div className="flex items-center space-x-1">
            <input
              type="text"
              id="username"
              placeholder="Apelido"
              maxLength="20"
              className="flex-1 px-2 py-1.5 bg-gray-700/50 rounded-md text-light focus:outline-none focus:ring-2 focus:ring-secondary border border-gray-600/50 transition text-sm"
            />
            <button
              id="setUsername"
              className="action-btn bg-secondary hover:bg-green-500 text-white p-1.5 rounded-md transition flex items-center justify-center"
            >
              <i className="fas fa-user-plus text-sm"></i>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Máx. 20 chars</p>
        </div>

        <div
          className="log flex-1 overflow-y-auto p-2 space-y-1 text-sm scrollbar-hide"
          id="logPanel"
        >
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-comment-dots text-lg mb-1"></i>
            <p className="text-xs">Atividades aparecerão aqui</p>
          </div>
        </div>

        <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-700/50">
          Ultra Bagual Video © 2023
        </div>
      </aside>

      <main
        className={`main-content flex-1 flex flex-col bg-gray-50 dark:bg-gray-900/50 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-0" : "ml-72"
        }`}
      >
        <button
          className="md:hidden p-2 bg-primary text-white rounded-r-lg fixed left-0 top-0 z-50"
          onClick={toggleSidebar}
        >
          <i className="fas fa-bars text-sm"></i>
        </button>

        <div className="video-container flex-1 relative p-4">
          <div
            className="remote-videos flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto scrollbar-hide p-2"
            id="remoteVideos"
            ref={remoteVideosRef}
          >
            {/* Placeholder será gerenciado dinamicamente */}
          </div>

          <div
            className="local-video draggable absolute bottom-4 right-4 rounded-lg overflow-hidden bg-gray-800 shadow-lg border border-gray-300 dark:border-gray-700"
            id="localVideoContainer"
            ref={localVideoContainerRef}
          >
            <video
              id="localVideo"
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            ></video>
            <div className="video-overlay absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-center">
                <div>
                  <span
                    className="label font-medium text-white text-sm"
                    id="localLabel"
                  >
                    Você
                  </span>
                  <span
                    className="status text-xs text-gray-300 block"
                    id="localStatus"
                  >
                    Câmera local
                  </span>
                </div>
                <div className="indicators flex space-x-1">
                  <i
                    className="fas fa-video text-white text-sm"
                    id="localVideoIndicator"
                  ></i>
                  <i
                    className="fas fa-microphone text-white text-sm"
                    id="localAudioIndicator"
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="control-bar glass-effect dark:bg-gray-800/80 p-3 flex justify-center gap-3 rounded-t-lg shadow-lg border-t border-gray-200 dark:border-gray-700/50 fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90">
          <button
            id="startCall"
            className="control-tooltip control-btn bg-primary hover:bg-primary-dark text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            data-tooltip="Iniciar"
            disabled
          >
            <i className="fas fa-play text-lg"></i>
          </button>
          <button
            id="toggleVideo"
            className="control-tooltip control-btn bg-white/90 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white p-2 rounded-full transition-all shadow-md"
            data-tooltip="Vídeo"
          >
            <i className="fas fa-video text-lg"></i>
          </button>
          <button
            id="toggleAudio"
            className="control-tooltip control-btn bg-white/90 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white p-2 rounded-full transition-all shadow-md"
            data-tooltip="Áudio"
          >
            <i className="fas fa-microphone text-lg"></i>
          </button>
          <button
            id="switchCamera"
            className="control-tooltip control-btn bg-white/90 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white p-2 rounded-full transition-all shadow-md"
            data-tooltip="Câmera"
          >
            <i className="fas fa-camera-rotate text-lg"></i>
          </button>
          <button
            id="fullscreen"
            className="control-tooltip control-btn bg-white/90 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white p-2 rounded-full transition-all shadow-md"
            data-tooltip="Tela cheia"
          >
            <i className="fas fa-expand text-lg"></i>
          </button>
          <button
            id="disconnect"
            className="control-tooltip control-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all shadow-md"
            data-tooltip="Sair"
          >
            <i className="fas fa-phone-slash text-lg"></i>
          </button>
        </div>
      </main>
    </div>
  );
}

// Estilos CSS em modules
import "../styles/globals.css";
