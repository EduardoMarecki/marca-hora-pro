import { Header } from "@/components/Header";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header title="Starter Template" />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <section className="prose dark:prose-invert">
          <h1>Sobre o Template</h1>
          <p>
            Este projeto serve como base reutilizável: layout, tema, componentes UI e configuração PWA já prontos.
          </p>
          <p>
            Personalize o Header passando uma lista de links por props ou altere os tokens de tema em index.css.
          </p>
        </section>
      </main>
    </div>
  );
};

export default About;