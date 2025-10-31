import { Header } from "@/components/Header";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header title="Starter Template" />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <section className="prose dark:prose-invert">
          <h1>Bem-vindo(a) 👋</h1>
          <p>
            Este é um template base com React + Vite + TypeScript + Tailwind + shadcn/ui.
            Use-o para iniciar novos projetos rapidamente, com layout e tema já configurados.
          </p>
          <ul>
            <li>Header configurável com links e tema</li>
            <li>Rotas básicas (Home, About)</li>
            <li>PWA e providers (Toaster, Tooltip, React Query)</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Home;