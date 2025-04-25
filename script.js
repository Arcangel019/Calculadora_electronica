
let responseChart = null;

function showTab(tabId) {
    // Oculta todos los contenidos de pestañas
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Desactiva todas las pestañas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activa la pestaña seleccionada
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function calculateRLC() {
    // Obtener valores de entrada
    const circuitType = document.getElementById('circuitType').value;
    const R = parseFloat(document.getElementById('resistance').value);
    const L = parseFloat(document.getElementById('inductance').value);
    const C = parseFloat(document.getElementById('capacitance').value);
    const V = parseFloat(document.getElementById('voltage').value);
    const f = parseFloat(document.getElementById('frequency').value);
    
    // Calcular parámetros básicos
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    const XL = 2 * Math.PI * f * L;
    const XC = 1 / (2 * Math.PI * f * C);
    
    // Calcular impedancia según el tipo de circuito
    let Z, I, dampingType, dampingRatio;
    
    if (circuitType === 'series') {
        Z = Math.sqrt(R * R + Math.pow(XL - XC, 2));
        I = V / Z;
        
        // Determinar tipo de amortiguamiento
        const alpha = R / (2 * L);
        const omega0 = 1 / Math.sqrt(L * C);
        dampingRatio = alpha / omega0;
        
        if (dampingRatio < 1) {
            dampingType = "Subamortiguado (Oscilaciones decrecientes)";
        } else if (dampingRatio === 1) {
            dampingType = "Críticamente amortiguado (Retorno rápido al equilibrio sin oscilaciones)";
        } else {
            dampingType = "Sobreamortiguado (Retorno lento al equilibrio sin oscilaciones)";
        }
    } else { // Paralelo
        const Y = Math.sqrt(1/(R*R) + Math.pow(1/XC - 1/XL, 2));
        Z = 1 / Y;
        I = V * Y;
        
        // Para circuito paralelo, el factor de amortiguamiento es diferente
        const alpha = 1 / (2 * R * C);
        const omega0 = 1 / Math.sqrt(L * C);
        dampingRatio = alpha / omega0;
        
        if (dampingRatio < 1) {
            dampingType = "Subamortiguado (Oscilaciones decrecientes)";
        } else if (dampingRatio === 1) {
            dampingType = "Críticamente amortiguado (Retorno rápido al equilibrio sin oscilaciones)";
        } else {
            dampingType = "Sobreamortiguado (Retorno lento al equilibrio sin oscilaciones)";
        }
    }
    
    // Calcular potencia
    const phi = Math.atan((XL - XC) / R);
    const P = V * I * Math.cos(phi);  // Potencia activa
    const Q = V * I * Math.sin(phi);  // Potencia reactiva
    const S = V * I;                  // Potencia aparente
    
    // Mostrar resultados
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="result-item">
            <strong>Frecuencia de Resonancia:</strong> ${f0.toFixed(2)} Hz
        </div>
        <div class="result-item">
            <strong>Reactancia Inductiva (Xₗ):</strong> ${XL.toFixed(2)} Ω
        </div>
        <div class="result-item">
            <strong>Reactancia Capacitiva (X꜀):</strong> ${XC.toFixed(2)} Ω
        </div>
        <div class="result-item">
            <strong>Impedancia Total (Z):</strong> ${Z.toFixed(2)} Ω
        </div>
        <div class="result-item">
            <strong>Corriente (I):</strong> ${I.toFixed(6)} A
        </div>
        <div class="result-item">
            <strong>Tipo de Amortiguamiento:</strong> ${dampingType}
        </div>
        <div class="result-item">
            <strong>Factor de Amortiguamiento (ζ):</strong> ${dampingRatio.toFixed(4)}
        </div>
        <div class="result-item">
            <strong>Potencia Activa (P):</strong> ${P.toFixed(4)} W
        </div>
        <div class="result-item">
            <strong>Potencia Reactiva (Q):</strong> ${Q.toFixed(4)} VAR
        </div>
        <div class="result-item">
            <strong>Potencia Aparente (S):</strong> ${S.toFixed(4)} VA
        </div>
        <div class="result-item">
            <strong>Ángulo de Fase (φ):</strong> ${(phi * 180/Math.PI).toFixed(2)}°
        </div>
    `;
    
    // Mostrar información de amortiguamiento
    document.getElementById('dampingInfo').innerHTML = `
        <h3>Información de Amortiguamiento</h3>
        <p><strong>Tipo:</strong> ${dampingType}</p>
        <p><strong>Factor de amortiguamiento (ζ):</strong> ${dampingRatio.toFixed(4)}</p>
        <p>${getDampingDescription(dampingRatio)}</p>
    `;
    
    // Generar gráfico de respuesta temporal
    generateResponseChart(R, L, C, dampingRatio, circuitType);
}

function getDampingDescription(zeta) {
    if (zeta < 1) {
        return "El circuito está subamortiguado. Presentará oscilaciones que decaen exponencialmente con el tiempo. La respuesta incluye componentes sinusoidales.";
    } else if (zeta === 1) {
        return "El circuito está críticamente amortiguado. Volverá al equilibrio en el menor tiempo posible sin oscilar.";
    } else {
        return "El circuito está sobreamortiguado. Volverá al equilibrio lentamente sin oscilar.";
    }
}

function generateResponseChart(R, L, C, zeta, circuitType) {
    const ctx = document.getElementById('responseChart').getContext('2d');
    
    // Configurar parámetros según el tipo de amortiguamiento
    let labels = [];
    let data = [];
    const omega0 = 1 / Math.sqrt(L * C);
    const alpha = zeta * omega0;
    
    // Generar datos para la gráfica
    const timeMax = zeta < 1 ? 4 * Math.PI / (omega0 * Math.sqrt(1 - zeta*zeta)) : 8 / alpha;
    
    for (let t = 0; t <= timeMax; t += timeMax / 100) {
        labels.push(t.toFixed(2));
        
        if (zeta < 1) { // Subamortiguado
            const omega_d = omega0 * Math.sqrt(1 - zeta*zeta);
            const response = Math.exp(-alpha * t) * Math.sin(omega_d * t);
            data.push(response);
        } else if (zeta === 1) { // Críticamente amortiguado
            const response = t * Math.exp(-omega0 * t);
            data.push(response);
        } else { // Sobreamortiguado
            const s1 = -alpha + omega0 * Math.sqrt(zeta*zeta - 1);
            const s2 = -alpha - omega0 * Math.sqrt(zeta*zeta - 1);
            const response = (Math.exp(s1 * t) - Math.exp(s2 * t)) / (2 * omega0 * Math.sqrt(zeta*zeta - 1));
            data.push(response);
        }
    }
    
    // Normalizar datos para mejor visualización
    const maxVal = Math.max(...data.map(Math.abs));
    data = data.map(val => val / maxVal);
    
    // Destruir gráfico anterior si existe
    if (responseChart) {
        responseChart.destroy();
    }
    
    // Crear nuevo gráfico
    responseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: circuitType === 'series' ? 'Corriente (Normalizada)' : 'Tensión (Normalizada)',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tiempo (s)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amplitud (Normalizada)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Respuesta Temporal del Circuito RLC',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Calcular al cargar la página con valores por defecto
window.onload = calculateRLC;
