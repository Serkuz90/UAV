let recognizer;

let audioContext;
let analyser;
let canvasContext;
let animationId;

async function init() {
    if (typeof speechCommands === 'undefined') {
        alert('Библиотека не загружена! Проверьте файл speech-commands.js');
        return;
    }

    recognizer = speechCommands.create(
        'BROWSER_FFT',
        null,
        'http://localhost:8000/my_model/model.json',
        'http://localhost:8000/my_model/metadata.json'
    );

    await recognizer.ensureModelLoaded();
    console.log('Модель готова! Классы:', recognizer.wordLabels());

    // Инициализация визуализации
    const canvas = document.getElementById('visualizer');
    canvasContext = canvas.getContext('2d');
}

// Функция для визуализации аудиопотока
function visualize() {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasContext.fillStyle = 'rgb(0, 0, 0)';
        canvasContext.fillRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        
        const barWidth = (canvasContext.canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            
            canvasContext.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            canvasContext.fillRect(
                x,
                canvasContext.canvas.height - barHeight,
                barWidth,
                barHeight
            );
            
            x += barWidth + 1;
        }
    }
    
    draw();
}

document.getElementById('startBtn').addEventListener('click', async () => {
    if (!recognizer) {
        alert('Сначала инициализируйте модель!');
        return;
    }

    // Создаем аудиоконтекст и анализатор
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Запускаем визуализацию
        visualize();
    } catch (err) {
        console.error('Ошибка доступа к микрофону:', err);
    }


    recognizer.listen(result => {
        const scores = result.scores;
        let html = '';
        scores.forEach((score, idx) => {
            html += `<div>${recognizer.wordLabels()[idx]}: ${score.toFixed(4)}</div>`;
        });
        document.getElementById('predictions').innerHTML = html;
    }, {
        overlapFactor: 0.5,
        probabilityThreshold: 0.75
    });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    if (recognizer && recognizer.isListening()) {
        await recognizer.stopListening();
    }
    
    // Останавливаем визуализацию
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Закрываем аудиоконтекст
    if (audioContext) {
        await audioContext.close();
    }
    
    // Обновляем состояние кнопок
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
});

window.onload = init;

window.onload = init;