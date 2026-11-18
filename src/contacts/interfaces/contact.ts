export interface Contact {
  created_at: string;
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  unsubscribed: boolean;
}

export type SelectingField =
  | {
      /**
       * The contact id.
       *
       * @link https://developer.send.io/docs/api       */
      id: string;
      /**
       * The contact email.
       *
       * @link https://developer.send.io/docs/api       */
      email?: undefined | null;
    }
  | {
      /**
       * The contact id.
       *
       * @link https://developer.send.io/docs/api       */
      id?: undefined | null;
      /**
       * The contact email.
       *
       * @link https://developer.send.io/docs/api       */
      email: string;
    };
