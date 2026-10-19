import LoginForm from './LoginForm'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata = {
  title: 'Fitness tracker login',
  robots: { index: false, follow: false },
}

export default async function FitLoginPage({ params }: Props) {
  const { slug } = await params
  return <LoginForm slug={slug} />
}
