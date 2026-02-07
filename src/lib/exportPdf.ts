import { Note } from "@/store/notesStore";

export async function exportNoteToPdf(note: Note): Promise<void> {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Format content - convert line breaks to HTML
  const formattedContent = note.content
    .split('\n')
    .map(line => `<p>${line || '&nbsp;'}</p>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${note.title || 'Untitled'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #333;
          }
          h1 {
            font-size: 28px;
            margin-bottom: 8px;
            color: #111;
          }
          .meta {
            font-size: 12px;
            color: #666;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #eee;
          }
          .folder {
            display: inline-block;
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 4px;
            margin-right: 12px;
          }
          .content p {
            margin-bottom: 8px;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <h1>${note.title || 'Untitled'}</h1>
        <div class="meta">
          <span class="folder">${note.folder}</span>
          <span>Last updated: ${formattedDate}</span>
        </div>
        <div class="content">
          ${formattedContent}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function generateShareableContent(note: Note): string {
  const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `${note.title || 'Untitled'}

${note.content}

---
${note.folder} | ${formattedDate}`;
}

export async function shareNote(note: Note): Promise<void> {
  const shareData = {
    title: note.title || 'Untitled',
    text: generateShareableContent(note),
  };

  if (navigator.share && navigator.canShare(shareData)) {
    await navigator.share(shareData);
  } else {
    // Fallback to clipboard
    await navigator.clipboard.writeText(generateShareableContent(note));
  }
}

export async function copyNoteToClipboard(note: Note): Promise<void> {
  const content = generateShareableContent(note);
  await navigator.clipboard.writeText(content);
}
