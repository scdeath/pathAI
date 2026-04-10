/**
 * Exportar roadmap a PDF
 * Usa técnicas nativas del navegador sin librerías externas
 */
export function exportRoadmapToPDF(career: any) {
  const html = generateRoadmapHTML(career)
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('Por favor, permite ventanas emergentes para exportar a PDF')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  
  // Esperar a que carguen los recursos
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

/**
 * Genera HTML para imprimir/PDF
 */
function generateRoadmapHTML(career: any): string {
  const now = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const roadsectionMapHTML = career.roadmap
    .map(
      (phase: any, idx: number) => `
    <div class="phase" style="page-break-inside: avoid;">
      <h3>Fase ${idx + 1}: ${phase.phase}</h3>
      <p class="duration"><strong>Duración:</strong> ${phase.duration}</p>
      <ul class="milestones">
        ${phase.milestones.map((m: string) => `<li>${m}</li>`).join('')}
      </ul>
    </div>
    `
    )
    .join('')

  const skillsHTML = career.skills
    .map((skill: string) => `<span class="skill">${skill}</span>`)
    .join('')

  const prosHTML = career.pros.map((pro: string) => `<li>${pro}</li>`).join('')
  const consHTML = career.cons.map((con: string) => `<li>${con}</li>`).join('')

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${career.title} - Roadmap Personalizado</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 40px;
          background: white;
        }
        
        .header {
          border-bottom: 3px solid #1A73E8;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        h1 {
          font-size: 32px;
          color: #1A73E8;
          margin-bottom: 5px;
        }
        
        .tagline {
          font-size: 16px;
          color: #64748b;
          font-style: italic;
        }
        
        .meta {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 10px;
        }
        
        .description {
          background: #f1f5f9;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          font-size: 14px;
        }
        
        h2 {
          font-size: 20px;
          color: #1e293b;
          margin-top: 30px;
          margin-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
        }
        
        h3 {
          font-size: 16px;
          color: #1A73E8;
          margin-top: 15px;
          margin-bottom: 10px;
        }
        
        .phase {
          margin-bottom: 20px;
          padding: 15px;
          background: #f8fafc;
          border-left: 4px solid #0891b2;
          border-radius: 4px;
        }
        
        .duration {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 10px;
        }
        
        ul {
          margin-left: 25px;
          margin-bottom: 15px;
        }
        
        li {
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .column h3 {
          margin-top: 0;
        }
        
        .pros li {
          color: #059669;
        }
        
        .cons li {
          color: #dc2626;
        }
        
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 30px;
        }
        
        .skill {
          display: inline-block;
          background: #dbeafe;
          color: #1A73E8;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }
        
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${career.emoji} ${career.title}</h1>
        <p class="tagline">${career.tagline}</p>
        <p class="meta">Generado el ${now} | PathAI</p>
      </div>
      
      <div class="description">
        ${career.description}
      </div>
      
      <div class="two-column">
        <div class="column">
          <h3>✓ Ventajas</h3>
          <ul class="pros">
            ${prosHTML}
          </ul>
        </div>
        <div class="column">
          <h3>⚠ Desventajas</h3>
          <ul class="cons">
            ${consHTML}
          </ul>
        </div>
      </div>
      
      <h2>Habilidades Clave</h2>
      <div class="skills">
        ${skillsHTML}
      </div>
      
      <h2>Roadmap Detallado</h2>
      ${roadsectionMapHTML}
      
      <div class="footer">
        <p>Este roadmap es personalizado según tu perfil. Sigue el plan paso a paso y alcanzarás tu objetivo.</p>
        <p style="margin-top: 10px;">www.pathAI.com</p>
      </div>
    </body>
  </html>
  `
}

/**
 * Exportar comparación de carreras
 */
export function exportComparisonToPDF(careers: any[]) {
  const html = generateComparisonHTML(careers)
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('Por favor, permite ventanas emergentes para exportar a PDF')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

/**
 * Genera HTML para comparación
 */
function generateComparisonHTML(careers: any[]): string {
  const now = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const tableHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Criterio</th>
          ${careers.map(c => `<th>${c.emoji} ${c.title}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Compatibilidad</strong></td>
          ${careers.map(c => `<td>${c.match_score}%</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Duración Estimada</strong></td>
          ${careers.map(c => `<td>${estimateDuration(c)} meses</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Habilidades</strong></td>
          ${careers.map(c => `<td>${c.skills.length} skills</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Comparación de Carreras - PathAI</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #1e293b;
          padding: 40px;
          background: white;
        }
        
        .header {
          border-bottom: 3px solid #1A73E8;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        h1 {
          font-size: 28px;
          color: #1A73E8;
          margin-bottom: 5px;
        }
        
        .meta {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 10px;
        }
        
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .comparison-table th,
        .comparison-table td {
          border: 1px solid #e2e8f0;
          padding: 12px;
          text-align: center;
          font-size: 14px;
        }
        
        .comparison-table th {
          background: #f1f5f9;
          color: #1e293b;
          font-weight: 600;
        }
        
        .comparison-table td:first-child {
          text-align: left;
          background: #f1f5f9;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Comparación de Carreras</h1>
        <p class="meta">Generado el ${now} | PathAI</p>
      </div>
      
      ${tableHTML}
      
      <div class="footer">
        <p>Usa esta comparación para tomar la mejor decisión sobre tu carrera.</p>
      </div>
    </body>
  </html>
  `
}

function estimateDuration(career: any): number {
  return career.roadmap.reduce((total: number, phase: any) => {
    const match = phase.duration.match(/(\d+)/)
    return total + (parseInt(match?.[1] || '0') || 0)
  }, 0)
}
