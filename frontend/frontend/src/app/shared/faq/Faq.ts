import { Component, signal } from '@angular/core';

@Component({
  selector: 'faq',
  templateUrl: './Faq.html',
})
export class FaqComponent {
  protected readonly openIndex = signal<number | null>(0);
  protected readonly faqs = [
    {
      question: 'Comment passer commande ?',
      answer: 'Choisissez le modèle qui vous plaît puis envoyez un message privé à @maghreperle.boutique sur Instagram.',
    },
    {
      question: 'Où découvrir les nouveautés ?',
      answer: 'Les nouveaux modèles et les inspirations MaghrePerle sont présentés directement sur notre profil Instagram.',
    },
    {
      question: 'Comment connaître les tailles et disponibilités ?',
      answer: 'Écrivez-nous en message privé avec le modèle souhaité pour obtenir les informations disponibles.',
    },
    {
      question: 'Comment contacter MaghrePerle ?',
      answer: 'Retrouvez-nous sur Instagram à @maghreperle.boutique et contactez-nous directement en DM.',
    },
  ];

  protected toggle(index: number): void {
    this.openIndex.update((open) => (open === index ? null : index));
  }
}
