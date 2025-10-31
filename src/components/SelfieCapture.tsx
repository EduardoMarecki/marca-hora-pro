import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, RotateCcw, Check, Upload, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SelfieCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const SelfieCapture = ({ onCapture, onCancel, isOpen }: SelfieCaptureProps) => {
  const [isWebcamMode, setIsWebcamMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detecta se é dispositivo móvel
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Função para listar câmeras disponíveis
  const listAvailableCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setDiagnosticInfo(prev => prev + "\n- Seu navegador não suporta enumeração de dispositivos");
        return;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setAvailableCameras(videoDevices);
      setDiagnosticInfo(prev => prev + `\n- Câmeras detectadas: ${videoDevices.length}`);
      
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error("Erro ao listar câmeras:", error);
      setDiagnosticInfo(prev => prev + `\n- Erro ao listar câmeras: ${(error as any)?.message || 'Desconhecido'}`);
    }
  }, [selectedCameraId]);

  // Coleta informações de diagnóstico
  const collectDiagnosticInfo = useCallback(() => {
    const browserInfo = `Navegador: ${navigator.userAgent}`;
    const secureContext = window.isSecureContext ? "Sim" : "Não";
    const mediaDevicesSupport = navigator.mediaDevices ? "Disponível" : "Não disponível";
    const getUserMediaSupport = navigator.mediaDevices?.getUserMedia ? "Disponível" : "Não disponível";
    
    setDiagnosticInfo(
      `Informações de diagnóstico:\n` +
      `- ${browserInfo}\n` +
      `- Contexto seguro: ${secureContext}\n` +
      `- API MediaDevices: ${mediaDevicesSupport}\n` +
      `- getUserMedia: ${getUserMediaSupport}`
    );
    
    // Verifica se estamos em localhost ou HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setDiagnosticInfo(prev => prev + "\n- AVISO: Acesso à câmera geralmente requer HTTPS ou localhost");
    }
  }, []);

  // Inicializa diagnóstico quando o componente monta
  useEffect(() => {
    if (isOpen) {
      collectDiagnosticInfo();
      listAvailableCameras();
    }
  }, [isOpen, collectDiagnosticInfo, listAvailableCameras]);

  const startWebcam = useCallback(async () => {
    try {
      setIsInitializing(true);
      setWebcamError(null);
      setVideoReady(false);
      
      // Atualiza diagnóstico
      setDiagnosticInfo(prev => prev + "\n- Tentando iniciar webcam...");

      // Constraints com o dispositivo selecionado, se houver
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? {
              deviceId: { exact: selectedCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: "user" },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: "user" },
            },
        audio: false,
      };

      let mediaStream: MediaStream;
      try {
        setDiagnosticInfo(prev => prev + "\n- Solicitando permissão de câmera...");
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setDiagnosticInfo(prev => prev + "\n- Permissão concedida, stream obtido");
      } catch (err: any) {
        console.warn('Falha com constraints avançados, tentando genéricos:', err?.name || err);
        setDiagnosticInfo(prev => prev + `\n- Falha inicial: ${err?.name || 'Desconhecido'}`);
        
        try {
          // Tenta com constraints mínimos
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setDiagnosticInfo(prev => prev + "\n- Sucesso com constraints genéricos");
        } catch (fallbackErr: any) {
          setDiagnosticInfo(prev => prev + `\n- Falha no fallback: ${fallbackErr?.name || 'Desconhecido'}`);
          throw fallbackErr; // Propaga o erro para o catch externo
        }
      }

      setStream(mediaStream);
      setIsWebcamMode(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        setDiagnosticInfo(prev => prev + "\n- Stream atribuído ao elemento de vídeo");

        // Função para verificar se o vídeo está realmente pronto
        const checkVideoReady = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
            setIsInitializing(false);
            setDiagnosticInfo(prev => prev + `\n- Vídeo pronto: ${video.videoWidth}x${video.videoHeight}`);
          }
        };

        // Múltiplos listeners para garantir que captamos o evento de prontidão
        const handleLoaded = () => {
          // Alguns navegadores exigem uma chamada explícita ao play()
          video.play().catch((playErr) => {
            console.error("Erro ao iniciar reprodução:", playErr);
            setDiagnosticInfo(prev => prev + `\n- Erro ao iniciar reprodução: ${playErr?.name || 'Desconhecido'}`);
          });
          
          // Verifica se o vídeo já tem dimensões
          checkVideoReady();
        };

        // Registra todos os eventos que podem indicar que o vídeo está pronto
        video.onloadedmetadata = handleLoaded;
        video.onloadeddata = handleLoaded;
        video.oncanplay = handleLoaded;
        video.onplaying = handleLoaded;
        video.onresize = checkVideoReady;

        // Se já estiver pronto, dispare imediatamente
        if (video.readyState >= 2) {
          handleLoaded();
        }

        // Fallback: polling para detectar dimensões válidas
        const start = Date.now();
        const poll = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
            setIsInitializing(false);
            setDiagnosticInfo(prev => prev + `\n- Vídeo pronto via polling: ${video.videoWidth}x${video.videoHeight}`);
            return;
          }
          
          if (Date.now() - start < 8000) {
            setTimeout(poll, 200);
          } else {
            setIsInitializing(false);
            setDiagnosticInfo(prev => prev + "\n- Timeout ao aguardar vídeo ficar pronto");
            // Não definimos erro aqui, apenas indicamos que a inicialização terminou
          }
        };
        setTimeout(poll, 200);
      }
    } catch (error: any) {
      console.error("Erro ao acessar webcam:", error);
      setIsInitializing(false);
      
      // Tratamento específico por tipo de erro
      if (error?.name === 'NotAllowedError') {
        setWebcamError("Permissão negada para acessar a câmera. Conceda acesso no navegador e tente novamente.");
        setDiagnosticInfo(prev => prev + "\n- Erro: Permissão negada (NotAllowedError)");
        toast.error("Permissão negada para acessar a câmera. Verifique o ícone na barra de endereço do navegador.");
      } else if (error?.name === 'NotFoundError') {
        setWebcamError("Nenhuma câmera encontrada. Verifique se há uma webcam conectada ao seu dispositivo.");
        setDiagnosticInfo(prev => prev + "\n- Erro: Câmera não encontrada (NotFoundError)");
        toast.error("Nenhuma câmera encontrada. Verifique se há uma webcam conectada.");
      } else if (error?.name === 'NotReadableError') {
        setWebcamError("Não foi possível acessar a câmera. Ela pode estar sendo usada por outro aplicativo.");
        setDiagnosticInfo(prev => prev + "\n- Erro: Câmera em uso (NotReadableError)");
        toast.error("Não foi possível acessar a câmera. Feche outros aplicativos que possam estar usando-a.");
      } else if (error?.name === 'OverconstrainedError') {
        setWebcamError("As configurações solicitadas não são suportadas pela sua câmera.");
        setDiagnosticInfo(prev => prev + "\n- Erro: Configurações não suportadas (OverconstrainedError)");
        toast.error("Sua câmera não suporta as configurações solicitadas. Tente novamente com configurações básicas.");
      } else {
        setWebcamError(`Não foi possível acessar a webcam. ${error?.message || 'Verifique as permissões do navegador.'}`);
        setDiagnosticInfo(prev => prev + `\n- Erro: ${error?.name || 'Desconhecido'} - ${error?.message || 'Sem detalhes'}`);
        toast.error("Não foi possível acessar a webcam. Verifique as permissões do navegador.");
      }
    }
  }, [selectedCameraId]);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      // Limpa a srcObject e handlers para evitar estados inconsistentes
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onloadeddata = null;
      videoRef.current.oncanplay = null;
      videoRef.current.onplaying = null;
      videoRef.current.onresize = null;
    }
    setVideoReady(false);
    setIsWebcamMode(false);
    setCapturedImage(null);
    setWebcamError(null);
    setIsInitializing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Evita captura com dimensões 0, que resulta em imagem preta
    if (!videoReady || !video.videoWidth || !video.videoHeight) {
      toast.warning('Webcam ainda inicializando. Aguarde alguns segundos e tente novamente.');
      return;
    }

    // Define o tamanho do canvas igual ao vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenha o frame atual do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converte para base64
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
  }, [videoReady]);

  const confirmCapture = useCallback(() => {
    if (!capturedImage) return;

    // Converte base64 para File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        stopWebcam();
      })
      .catch(error => {
        console.error("Erro ao processar imagem:", error);
        toast.error("Erro ao processar a imagem capturada");
      });
  }, [capturedImage, onCapture, stopWebcam]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCapture(file);
    }
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onCapture]);

  const handleCancel = useCallback(() => {
    stopWebcam();
    onCancel();
  }, [stopWebcam, onCancel]);

  // Limpa recursos quando o dialog fecha
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleCancel();
    }
  }, [handleCancel]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Capturar Selfie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isWebcamMode && !capturedImage && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Escolha como deseja capturar sua selfie:
              </p>
              
              <div className="grid gap-2">
                {/* Opção para Desktop: Webcam */}
                {!isMobile && (
                  <Button
                    onClick={startWebcam}
                    className="w-full"
                    variant="outline"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Usar Webcam
                  </Button>
                )}

                {/* Opção para Mobile: Câmera nativa ou Desktop: Upload */}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  variant="outline"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isMobile ? "Usar Câmera" : "Selecionar Arquivo"}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture={isMobile ? "user" : undefined}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {isWebcamMode && !capturedImage && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                {!videoReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm bg-black/80 p-4">
                    {isInitializing ? (
                      <>
                        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                        <p>Inicializando webcam...</p>
                      </>
                    ) : webcamError ? (
                      <>
                        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                        <p className="text-center mb-2">{webcamError}</p>
                        <div className="flex gap-2 mt-2">
                          <Button onClick={() => { stopWebcam(); startWebcam(); }} variant="secondary" size="sm">
                            <RefreshCw className="mr-1 h-4 w-4" />
                            Tentar Novamente
                          </Button>
                          <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            variant="secondary"
                            size="sm"
                          >
                            <Upload className="mr-1 h-4 w-4" />
                            Usar Arquivo
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>Aguardando webcam...</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={capturePhoto} size="lg" disabled={!videoReady}>
                  <Camera className="mr-2 h-4 w-4" />
                  Capturar
                </Button>
                <Button onClick={stopWebcam} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                {!videoReady && (
                  <Button onClick={() => { stopWebcam(); startWebcam(); }} variant="secondary">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reiniciar
                  </Button>
                )}
                {videoReady && (
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Arquivo
                  </Button>
                )}
              </div>
              
              {availableCameras.length > 1 && (
                <div className="mt-2">
                  <label className="text-sm font-medium">Selecionar câmera:</label>
                  <select 
                    className="w-full p-2 border rounded mt-1"
                    value={selectedCameraId || ''}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (stream) {
                        stopWebcam();
                        setTimeout(() => startWebcam(), 500);
                      }
                    }}
                  >
                    {availableCameras.map(camera => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Câmera ${camera.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {webcamError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 font-medium">Erro na webcam:</p>
                  <p className="text-xs text-red-700">{webcamError}</p>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium">Mostrar diagnóstico técnico</summary>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-gray-800 overflow-auto text-[10px] max-h-32">
                      {diagnosticInfo}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {capturedImage && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Selfie capturada"
                  className="w-full h-64 object-cover"
                />
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={confirmCapture} size="lg">
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar
                </Button>
                <Button onClick={retakePhoto} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refazer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};