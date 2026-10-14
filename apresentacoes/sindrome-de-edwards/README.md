# Síndrome de Edwards: apresentação animada

Os 7 slides do PDF original viraram uma apresentação animada que roda no navegador.

## Como apresentar

1. Abra **`sindrome-de-edwards-offline.html`** no Chrome ou Edge (duplo clique). É um arquivo
   único: funciona sem internet e pode ir num pendrive.
2. Aperte **F** para tela cheia.
3. Avance com **→**, **espaço**, **Enter**, **clique** ou o botão do passador de slides.
   Volte com **←** ou **clique direito**. **Home** e **End** pulam para o primeiro e o último slide.

A barra de navegação aparece quando o mouse se mexe e some sozinha depois de 2,6 segundos.

## O que acontece na tela

- **Fundo vivo:** um shader WebGL faz as células e o DNA ondularem bem devagar, com duas luzes
  passeando, raios suaves vindos de cima, brilho de cáustica e partículas em profundidade. A câmera
  respira de leve (zoom e deslocamento quase imperceptíveis) e acompanha o mouse em paralaxe.
- **Transição interligada:** o slide atual afunda e desfoca, o fundo "mergulha" com zoom e se
  dissolve como líquido no próximo, um feixe de luz cruza a tela e o novo slide entra no foco,
  como um microscópio ajustando a lente.
- **Revelação em sequência:** os painéis de vidro se materializam com um brilho que percorre a
  superfície; cromossomos sobem do fundo com luz; ilustrações entram em foco; ícones aparecem com
  um pulso; linhas conectoras se desenham; títulos sobem palavra por palavra ou letra por letra; listas
  entram item a item, com o check sendo desenhado.

Se o computador não tiver WebGL, ou se a placa de vídeo derrubar o contexto, a apresentação segue
com o fundo animado em CSS. Se a máquina estiver lenta, o fundo reduz a resolução sozinho.

## Estrutura

```
index.html        conteúdo dos slides (texto real, posições e ordem de entrada)
style.css         visual (vidro, tipografia, luzes)
app.js            motor: shader do fundo, partículas, transições e revelações
fonts.css         Plus Jakarta Sans + Noto Serif Display (OFL), servidas localmente
assets/plates/    fundos limpos de cada slide (sem texto; o que vai ser revelado fica desfocado)
assets/layers/    recortes animáveis (painéis, cards, cromossomos, ilustrações, ícones)
assets/manifest.* posição de cada recorte
tools/            scripts que geram tudo a partir do PDF
```

Para servir a versão em pastas (em vez do arquivo único), rode um servidor estático nesta pasta
(ex.: `python3 -m http.server`). Abrir o `index.html` direto do disco desliga o WebGL por
segurança do navegador; o arquivo `-offline.html` não tem essa limitação.

### Regerar a partir do PDF

```bash
pip install numpy pillow opencv-python-headless   # + poppler-utils (pdftoppm)
python3 tools/make_assets.py /caminho/SLIDE.pdf    # fundos, recortes e manifest
python3 tools/bundle.py                             # gera o arquivo único offline
```

A geometria de cada recorte está em `tools/spec.py`.

## Fundos em vídeo com Higgsfield (opcional)

O motor já aceita um vídeo em loop por slide no lugar da imagem fixa. Quando existe
`assets/video/sN.mp4`, o vídeo vira a textura do fundo e o shader continua cuidando da luz,
do foco e das transições.

Configuração sugerida para cada slide (Kling 3.0, imagem para vídeo):

- **Quadro inicial e quadro final:** `assets/plates/sN.jpg` (o mesmo arquivo nos dois, pro loop
  fechar sem emenda)
- **Duração:** 10 s · **Proporção:** 16:9 · **Som:** desligado

Prompt (o mesmo para todos):

> Locked-off static camera, no camera movement, no zoom, no pan. Microscopic scientific scene in
> soft pale blue. Keep the exact composition, every shape stays in place. Background elements drift
> extremely slowly: cells float and breathe gently, DNA strands turn almost imperceptibly, tiny
> particles rise like dust in a beam of light. Soft volumetric light slowly sweeps across the scene
> with a gentle caustic shimmer. The blurred bright areas stay blurred and still. Calm, elegant,
> premium, seamless loop. No text, no new objects.

Depois de baixar os 7 vídeos para `assets/video/` (s1.mp4 … s7.mp4):

```bash
python3 tools/link_videos.py         # registra os vídeos no manifest
python3 tools/bundle.py --videos     # arquivo único com os vídeos embutidos (fica bem maior)
```
