export function Footer() {
  return (
    <footer className="bg-primary-900 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        <div className="flex flex-col gap-4">
          <h3 className="text-body-semibold text-inverse">Serviços</h3>
          <ul className="flex flex-col gap-2">
            <li>
              <a href="#" className="text-body text-inverse hover:opacity-80 transition-opacity">
                Conta corrente
              </a>
            </li>
            <li>
              <a href="#" className="text-body text-inverse hover:opacity-80 transition-opacity">
                Conta PJ
              </a>
            </li>
            <li>
              <a href="#" className="text-body text-inverse hover:opacity-80 transition-opacity">
                Cartão de crédito
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-body-semibold text-inverse">Contato</h3>
          <ul className="flex flex-col gap-2">
            <li>
              <a href="tel:08000042508" className="text-body text-inverse hover:opacity-80 transition-opacity">
                0800 004 250 08
              </a>
            </li>
            <li>
              <a href="mailto:meajuda@bytebank.com.br" className="text-body text-inverse hover:opacity-80 transition-opacity">
                meajuda@bytebank.com.br
              </a>
            </li>
            <li>
              <a href="mailto:ouvidoria@bytebank.com.br" className="text-body text-inverse hover:opacity-80 transition-opacity">
                ouvidoria@bytebank.com.br
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-body-semibold text-inverse">Desenvolvido por Alura</h3>
          <div className="flex gap-4">
            <a href="#" aria-label="Instagram" className="text-inverse hover:opacity-80 transition-opacity">
              <span className="material-icons text-icon-sm">photo_camera</span>
            </a>
            <a href="#" aria-label="WhatsApp" className="text-inverse hover:opacity-80 transition-opacity">
              <span className="material-icons text-icon-sm">chat</span>
            </a>
            <a href="#" aria-label="YouTube" className="text-inverse hover:opacity-80 transition-opacity">
              <span className="material-icons text-icon-sm">play_circle</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
