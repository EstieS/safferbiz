import LoginForm from './LoginForm'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata = { title: 'Book club login — SafferBiz' }

export default async function ClubLoginPage({ params }: Props) {
  const { slug } = await params
  return <LoginForm slug={slug} />
}
